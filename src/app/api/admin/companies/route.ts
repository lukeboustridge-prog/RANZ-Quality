export const runtime = 'nodejs';

/**
 * Admin Companies List Endpoint
 *
 * GET /api/admin/companies
 *
 * Returns paginated list of companies with search, filter, and sort capabilities.
 * Includes user count for each company.
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search in name, tradingName (optional)
 * - status: Filter by AuthCompanyStatus (optional)
 * - sortBy: Field to sort by (default: createdAt)
 * - sortOrder: asc or desc (default: desc)
 *
 * Required role: RANZ_ADMIN or RANZ_STAFF
 */

import { db } from '@/lib/db';
import { getSessionFromRequest, verifyToken } from '@/lib/auth';
import { AuthCompanyStatus, Prisma } from '@prisma/client';

/**
 * Allowed fields for sorting.
 */
const ALLOWED_SORT_FIELDS = ['createdAt', 'name', 'tradingName', 'status'] as const;

type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

/**
 * Validate sortBy parameter.
 */
function isValidSortField(field: string): field is SortField {
  return ALLOWED_SORT_FIELDS.includes(field as SortField);
}

export async function GET(request: Request): Promise<Response> {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Filters
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    // Sorting
    const sortByParam = searchParams.get('sortBy') || 'createdAt';
    const sortBy: SortField = isValidSortField(sortByParam) ? sortByParam : 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where: Prisma.AuthCompanyWhereInput = {};

    // Search filter (name, tradingName)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tradingName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status && Object.values(AuthCompanyStatus).includes(status as AuthCompanyStatus)) {
      where.status = status as AuthCompanyStatus;
    }

    // Run parallel queries for companies and count
    const [companies, total] = await Promise.all([
      db.authCompany.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          tradingName: true,
          organizationId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { users: true },
          },
        },
      }),
      db.authCompany.count({ where }),
    ]);

    // Transform to include userCount at top level
    const transformedCompanies = companies.map(({ _count, ...company }) => ({
      ...company,
      userCount: _count.users,
    }));

    return Response.json({
      companies: transformedCompanies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Companies List] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
