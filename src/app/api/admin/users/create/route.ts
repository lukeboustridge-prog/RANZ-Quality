export const runtime = 'nodejs';

/**
 * Admin User Creation Endpoint
 *
 * POST /api/admin/users/create
 *
 * Allows RANZ administrators to create new user accounts.
 * Sends welcome email with activation link (never sends passwords).
 *
 * Implements:
 * - AUTH-02: Welcome email with activation link
 * - AUTH-09: Configurable activation expiry (default 7 days)
 *
 * Required role: RANZ_ADMIN or RANZ_STAFF
 */

import { db } from '@/lib/db';
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
 * Request body for creating a new user.
 */
interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  companyId?: string;
  phone?: string;
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
    // Authenticate admin (works with both Clerk and custom auth)
    const authResult = await authenticateAdminRequest(request);
    if (!authResult.success) {
      return adminAuthErrorResponse(authResult);
    }

    // Parse request body
    let body: CreateUserRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!isValidEmail(body.email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!body.firstName || typeof body.firstName !== 'string' || body.firstName.trim() === '') {
      return Response.json({ error: 'First name is required' }, { status: 400 });
    }

    if (!body.lastName || typeof body.lastName !== 'string' || body.lastName.trim() === '') {
      return Response.json({ error: 'Last name is required' }, { status: 400 });
    }

    if (!body.userType || !isValidUserType(body.userType)) {
      return Response.json(
        {
          error: 'Invalid user type',
          validTypes: Object.values(AuthUserType),
        },
        { status: 400 }
      );
    }

    // Company ID required for member user types
    const companyRequiredTypes: AuthUserType[] = ['MEMBER_COMPANY_ADMIN', 'MEMBER_COMPANY_USER'];
    if (companyRequiredTypes.includes(body.userType as AuthUserType) && !body.companyId) {
      return Response.json(
        { error: 'Company ID is required for member user types' },
        { status: 400 }
      );
    }

    // Check email uniqueness (case-insensitive)
    const normalizedEmail = body.email.toLowerCase().trim();
    const existing = await db.authUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return Response.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Verify company exists if provided
    if (body.companyId) {
      const company = await db.authCompany.findUnique({
        where: { id: body.companyId },
      });
      if (!company) {
        return Response.json({ error: 'Company not found' }, { status: 404 });
      }
    }

    // Get activation expiry from env (default 7 days per AUTH-09)
    const ACTIVATION_EXPIRY_DAYS = parseInt(process.env.ACTIVATION_EXPIRY_DAYS || '7', 10);

    // Generate activation token
    const { token: activationToken, tokenHash, expiresAt } = await generateActivationToken(
      'pending', // Temporary placeholder, will be updated after user created
      ACTIVATION_EXPIRY_DAYS
    );

    // Create user in PENDING_ACTIVATION status
    const user = await db.authUser.create({
      data: {
        email: normalizedEmail,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        userType: body.userType as AuthUserType,
        companyId: body.companyId || null,
        phone: body.phone?.trim() || null,
        status: 'PENDING_ACTIVATION',
        mustChangePassword: true,
        createdBy: authResult.user.id,
      },
    });

    // Create password reset record (reusing for activation)
    await db.authPasswordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        requestedIp: ip,
        expiresAt,
      },
    });

    // Build activation URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.ranz.co.nz';
    const activationUrl = `${appUrl}/auth/activate?token=${activationToken}`;

    // Send welcome email
    const emailResult = await sendWelcomeEmail({
      to: user.email,
      firstName: user.firstName,
      activationUrl,
      expiresIn: `${ACTIVATION_EXPIRY_DAYS} days`,
    });

    // Log user creation event
    await logAuthEvent({
      action: 'USER_CREATED',
      actorId: authResult.user.id,
      actorEmail: authResult.user.email,
      actorRole: authResult.user.userType,
      ipAddress: ip,
      resourceType: 'AuthUser',
      resourceId: user.id,
      metadata: {
        targetEmail: user.email,
        userType: user.userType,
        companyId: user.companyId,
      },
    });

    // Log welcome email sent
    await logAuthEvent({
      action: AUTH_ACTIONS.WELCOME_EMAIL_SENT,
      actorId: authResult.user.id,
      actorEmail: authResult.user.email,
      actorRole: authResult.user.userType,
      ipAddress: ip,
      resourceType: 'AuthUser',
      resourceId: user.id,
      metadata: {
        targetEmail: user.email,
        emailResult: emailResult.error ? { error: emailResult.error } : { id: emailResult.id },
      },
    });

    // Return created user (without sensitive data)
    return Response.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          status: user.status,
          companyId: user.companyId,
          activationExpires: expiresAt,
        },
        emailSent: !emailResult.error,
        emailError: emailResult.error,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Admin Create User] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
