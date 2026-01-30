export const runtime = 'nodejs';

/**
 * Admin Users List Endpoint
 *
 * GET /api/admin/users
 *
 * Returns paginated list of users with search, filter, and sort capabilities.
 * Supports filtering by status, userType, and companyId.
 *
 * Required role: RANZ_ADMIN or RANZ_STAFF
 */

import { db } from '@/lib/db';
import { authenticateAdminRequest, adminAuthErrorResponse } from '@/lib/auth/admin-api';
import { AuthUserStatus, AuthUserType, Prisma } from '@prisma/client';

/**
 * Allowed fields for sorting.
 */
const ALLOWED_SORT_FIELDS = [
  'createdAt',
  'email',
  'firstName',
  'lastName',
  'lastLoginAt',
  'status',
  'userType',
] as const;

type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

/**
 * Validate sortBy parameter.
 */
function isValidSortField(field: string): field is SortField {
  return ALLOWED_SORT_FIELDS.includes(field as SortField);
}

export async function GET(request: Request): Promise<Response> {
  try {
    // Authenticate admin (works with both Clerk and custom auth)
    const authResult = await authenticateAdminRequest(request);
    if (!authResult.success) {
      return adminAuthErrorResponse(authResult);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Filters
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');
    const userType = searchParams.get('userType');
    const companyId = searchParams.get('companyId');

    // Sorting
    const sortByParam = searchParams.get('sortBy') || 'createdAt';
    const sortBy: SortField = isValidSortField(sortByParam) ? sortByParam : 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

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

    // Run parallel queries for users and count
    const [users, total] = await Promise.all([
      db.authUser.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          userType: true,
          status: true,
          companyId: true,
          company: { select: { id: true, name: true } },
          createdAt: true,
          lastLoginAt: true,
          lockedUntil: true,
          mustChangePassword: true,
        },
      }),
      db.authUser.count({ where }),
    ]);

    return Response.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Users List] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
