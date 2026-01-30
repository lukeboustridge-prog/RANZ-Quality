export const runtime = 'nodejs';

/**
 * Admin Single Company Endpoint
 *
 * GET /api/admin/companies/[id]
 *
 * Returns company details with list of associated users.
 *
 * Required role: RANZ_ADMIN or RANZ_STAFF
 */

import { db } from '@/lib/db';
import { authenticateAdminRequest, adminAuthErrorResponse } from '@/lib/auth/admin-api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // Authenticate admin (works with both Clerk and custom auth)
    const authResult = await authenticateAdminRequest(request);
    if (!authResult.success) {
      return adminAuthErrorResponse(authResult);
    }

    const { id: companyId } = await params;

    // Get company with users
    const company = await db.authCompany.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        tradingName: true,
        organizationId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userType: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
          },
          orderBy: {
            lastName: 'asc',
          },
        },
      },
    });

    if (!company) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    return Response.json({ company });
  } catch (error) {
    console.error('[Admin Company GET] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
