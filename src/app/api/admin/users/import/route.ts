export const runtime = 'nodejs';

/**
 * Admin User CSV Import Endpoint
 *
 * POST /api/admin/users/import
 *
 * Allows RANZ administrators to bulk import users via CSV file upload.
 * All rows are validated before any users are created (atomic transaction).
 *
 * Implements:
 * - CSV parsing with papaparse
 * - Pre-validation of all rows before creation
 * - Atomic transaction for user creation
 * - Welcome emails sent after successful import
 *
 * Required role: RANZ_ADMIN only (bulk operations are high-risk)
 */

import { db } from '@/lib/db';
import Papa from 'papaparse';
import {
  generateActivationToken,
  sendWelcomeEmail,
  logAuthEvent,
  AUTH_ACTIONS,
  getIPFromRequest,
} from '@/lib/auth';
import { authenticateAdminRequest, adminAuthErrorResponse } from '@/lib/auth/admin-api';
import { AuthUserType } from '@prisma/client';

/**
 * Maximum number of users allowed per import.
 */
const MAX_IMPORT_ROWS = 100;

/**
 * Activation token expiry in days.
 */
const ACTIVATION_EXPIRY_DAYS = parseInt(process.env.ACTIVATION_EXPIRY_DAYS || '7', 10);

/**
 * CSV row structure (lowercase headers after transform).
 */
interface CSVRow {
  email: string;
  firstname: string;
  lastname: string;
  usertype: string;
  companyname?: string;
  phone?: string;
}

/**
 * Validated row ready for creation.
 */
interface ValidatedRow {
  email: string;
  firstName: string;
  lastName: string;
  userType: AuthUserType;
  companyId: string | null;
  phone: string | null;
}

/**
 * Validation error for a specific row.
 */
interface RowError {
  row: number;
  field: string;
  message: string;
}

/**
 * Validate email format.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if userType is a valid AuthUserType enum value.
 */
function isValidUserType(userType: string): userType is AuthUserType {
  return Object.values(AuthUserType).includes(userType as AuthUserType);
}

export async function POST(request: Request): Promise<Response> {
  const ip = getIPFromRequest(request);

  try {
    // Authenticate admin (RANZ_ADMIN only for bulk operations)
    const authResult = await authenticateAdminRequest(request, ['RANZ_ADMIN']);
    if (!authResult.success) {
      return adminAuthErrorResponse(authResult);
    }

    const actorId = authResult.user.id;
    const actorEmail = authResult.user.email;
    const actorRole = authResult.user.userType;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'CSV file is required' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return Response.json({ error: 'File must be a CSV file' }, { status: 400 });
    }

    // Read file content
    const csvText = await file.text();

    // Parse CSV
    const parseResult = Papa.parse<CSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (parseResult.errors.length > 0) {
      return Response.json(
        {
          success: false,
          error: 'CSV parsing errors',
          errors: parseResult.errors.map((e) => ({
            row: e.row,
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const rows = parseResult.data;

    if (rows.length === 0) {
      return Response.json({ error: 'CSV file is empty' }, { status: 400 });
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      return Response.json(
        { error: `Maximum ${MAX_IMPORT_ROWS} users per import. File contains ${rows.length} rows.` },
        { status: 400 }
      );
    }

    // Validation phase - validate ALL rows before creating any users
    const validationErrors: RowError[] = [];
    const validatedRows: ValidatedRow[] = [];
    const emailsInCSV = new Set<string>();

    // Get all existing emails for uniqueness check
    const existingEmails = new Set(
      (
        await db.authUser.findMany({
          select: { email: true },
        })
      ).map((u) => u.email.toLowerCase())
    );

    // Get all companies for name lookup
    const companies = await db.authCompany.findMany({
      select: { id: true, name: true },
    });
    const companyMap = new Map(companies.map((c) => [c.name.toLowerCase(), c.id]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // CSV row number (1-indexed + header row)

      // Validate email
      const email = row.email?.trim().toLowerCase();
      if (!email) {
        validationErrors.push({ row: rowNum, field: 'email', message: 'Email is required' });
        continue;
      }

      if (!isValidEmail(email)) {
        validationErrors.push({ row: rowNum, field: 'email', message: 'Invalid email format' });
        continue;
      }

      if (existingEmails.has(email)) {
        validationErrors.push({
          row: rowNum,
          field: 'email',
          message: 'Email already exists in database',
        });
        continue;
      }

      if (emailsInCSV.has(email)) {
        validationErrors.push({
          row: rowNum,
          field: 'email',
          message: 'Duplicate email in CSV file',
        });
        continue;
      }
      emailsInCSV.add(email);

      // Validate firstName
      const firstName = row.firstname?.trim();
      if (!firstName) {
        validationErrors.push({ row: rowNum, field: 'firstname', message: 'First name is required' });
        continue;
      }

      // Validate lastName
      const lastName = row.lastname?.trim();
      if (!lastName) {
        validationErrors.push({ row: rowNum, field: 'lastname', message: 'Last name is required' });
        continue;
      }

      // Validate userType
      const userType = row.usertype?.trim().toUpperCase();
      if (!userType) {
        validationErrors.push({ row: rowNum, field: 'usertype', message: 'User type is required' });
        continue;
      }

      if (!isValidUserType(userType)) {
        validationErrors.push({
          row: rowNum,
          field: 'usertype',
          message: `Invalid user type. Valid types: ${Object.values(AuthUserType).join(', ')}`,
        });
        continue;
      }

      // Validate company for member user types
      const companyRequiredTypes: AuthUserType[] = ['MEMBER_COMPANY_ADMIN', 'MEMBER_COMPANY_USER'];
      let companyId: string | null = null;

      if (companyRequiredTypes.includes(userType as AuthUserType)) {
        const companyName = row.companyname?.trim();
        if (!companyName) {
          validationErrors.push({
            row: rowNum,
            field: 'companyname',
            message: 'Company name is required for member user types',
          });
          continue;
        }

        companyId = companyMap.get(companyName.toLowerCase()) || null;
        if (!companyId) {
          validationErrors.push({
            row: rowNum,
            field: 'companyname',
            message: `Company not found: ${companyName}`,
          });
          continue;
        }
      }

      // Row is valid
      validatedRows.push({
        email,
        firstName,
        lastName,
        userType: userType as AuthUserType,
        companyId,
        phone: row.phone?.trim() || null,
      });
    }

    // If any validation errors, return without creating any users
    if (validationErrors.length > 0) {
      return Response.json(
        {
          success: false,
          error: 'Validation errors found',
          errors: validationErrors,
          validRows: validatedRows.length,
          totalRows: rows.length,
        },
        { status: 400 }
      );
    }

    // Create users in transaction
    const createdUsers: Array<{
      user: { id: string; email: string; firstName: string };
      token: string;
    }> = [];

    await db.$transaction(async (tx) => {
      for (const row of validatedRows) {
        // Create user
        const user = await tx.authUser.create({
          data: {
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            userType: row.userType,
            companyId: row.companyId,
            phone: row.phone,
            status: 'PENDING_ACTIVATION',
            mustChangePassword: true,
            createdBy: actorId,
          },
        });

        // Generate activation token
        const { token, tokenHash, expiresAt } = await generateActivationToken(
          user.id,
          ACTIVATION_EXPIRY_DAYS
        );

        // Create password reset record for activation
        await tx.authPasswordReset.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
            requestedIp: ip,
          },
        });

        createdUsers.push({
          user: { id: user.id, email: user.email, firstName: user.firstName },
          token,
        });
      }
    });

    // Send welcome emails (outside transaction, fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.ranz.co.nz';
    let emailsSent = 0;
    const emailErrors: Array<{ email: string; error: string }> = [];

    for (const { user, token } of createdUsers) {
      const activationUrl = `${appUrl}/auth/activate?token=${token}`;

      const result = await sendWelcomeEmail({
        to: user.email,
        firstName: user.firstName,
        activationUrl,
        expiresIn: `${ACTIVATION_EXPIRY_DAYS} days`,
      });

      if (result.error) {
        emailErrors.push({ email: user.email, error: result.error });
      } else {
        emailsSent++;
      }
    }

    // Log bulk import event
    await logAuthEvent({
      action: AUTH_ACTIONS.USER_BATCH_UPDATED,
      actorId,
      actorEmail,
      actorRole,
      ipAddress: ip,
      resourceType: 'AuthUser',
      metadata: {
        operation: 'import',
        count: createdUsers.length,
        emailsSent,
        emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
      },
    });

    return Response.json({
      success: true,
      imported: createdUsers.length,
      emailsSent,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
      users: createdUsers.map(({ user }) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
      })),
    });
  } catch (error) {
    console.error('[Admin CSV Import] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
