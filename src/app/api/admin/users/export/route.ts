export const runtime = 'nodejs';

/**
 * Admin User CSV Export Endpoint
 *
 * GET /api/admin/users/export
 *
 * Exports users as a downloadable CSV file with current filters applied.
 * Uses the same filter parameters as the user list endpoint.
 *
 * Required role: RANZ_ADMIN or RANZ_STAFF
 */

import { db } from '@/lib/db';
import Papa from 'papaparse';
import {
  getSessionFromRequest,
  verifyToken,
  getIPFromRequest,
  logAuthEvent,
  AUTH_ACTIONS,
} from '@/lib/auth';
import { AuthUserStatus, AuthUserType, Prisma } from '@prisma/client';

/**
 * Maximum number of rows to export to prevent timeout.
 */
const MAX_EXPORT_ROWS = 10000;

export async function GET(request: Request): Promise<Response> {
  const ip = getIPFromRequest(request);

  try {
    // Authenticate admin
    const sessionToken = getSessionFromRequest(request);
    if (!sessionToken) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(sessionToken);
    if (!payload) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check admin role (RANZ_ADMIN or RANZ_STAFF)
    const allowedRoles = ['RANZ_ADMIN', 'RANZ_STAFF'];
    if (!allowedRoles.includes(payload.role as string)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const actorId = payload.sub as string;
    const actorEmail = payload.email as string;
    const actorRole = payload.role as string;

    // Parse query parameters (same as user list endpoint)
    const { searchParams } = new URL(request.url);

    // Filters
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');
    const userType = searchParams.get('userType');
    const companyId = searchParams.get('companyId');

    // Build where clause
    const where: Prisma.AuthUserWhereInput = {};

    // Search filter (email, firstName, lastName)
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status && Object.values(AuthUserStatus).includes(status as AuthUserStatus)) {
      where.status = status as AuthUserStatus;
    }

    // UserType filter
    if (userType && Object.values(AuthUserType).includes(userType as AuthUserType)) {
      where.userType = userType as AuthUserType;
    }

    // Company filter
    if (companyId) {
      where.companyId = companyId;
    }

    // Fetch ALL matching users (no pagination for export, but limit for safety)
    const users = await db.authUser.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        userType: true,
        status: true,
        company: { select: { name: true } },
        createdAt: true,
        lastLoginAt: true,
      },
    });

    // Transform to CSV-friendly format
    const csvData = users.map((u) => ({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone || '',
      userType: u.userType,
      status: u.status,
      company: u.company?.name || '',
      createdAt: u.createdAt.toISOString(),
      lastLogin: u.lastLoginAt?.toISOString() || '',
    }));

    // Generate CSV
    const csv = Papa.unparse(csvData, {
      header: true,
      columns: [
        'email',
        'firstName',
        'lastName',
        'phone',
        'userType',
        'status',
        'company',
        'createdAt',
        'lastLogin',
      ],
    });

    // Build filter summary for audit log
    const filterSummary: Record<string, string> = {};
    if (search) filterSummary.search = search;
    if (status) filterSummary.status = status;
    if (userType) filterSummary.userType = userType;
    if (companyId) filterSummary.companyId = companyId;

    // Log export event
    await logAuthEvent({
      action: AUTH_ACTIONS.USER_BATCH_UPDATED,
      actorId,
      actorEmail,
      actorRole,
      ipAddress: ip,
      resourceType: 'AuthUser',
      metadata: {
        operation: 'export',
        count: users.length,
        filters: Object.keys(filterSummary).length > 0 ? filterSummary : undefined,
      },
    });

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `users-export-${date}.csv`;

    // Return CSV with appropriate headers
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Admin CSV Export] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
