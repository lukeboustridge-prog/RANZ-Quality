export const runtime = 'nodejs';

/**
 * Admin Audit Logs Endpoint
 *
 * GET /api/admin/audit-logs
 *
 * Returns paginated list of authentication audit log entries with filtering.
 * Supports filtering by action, actor, resource, and date range.
 *
 * Required role: RANZ_ADMIN or RANZ_STAFF
 */

import { db } from '@/lib/db';
import { authenticateAdminRequest, adminAuthErrorResponse } from '@/lib/auth/admin-api';
import { Prisma } from '@prisma/client';

// Default to last 90 days for performance if no date range specified
const DEFAULT_LOOKBACK_DAYS = 90;

export async function GET(request: Request): Promise<Response> {
  try {
    // Authenticate admin (works with both Clerk and custom auth)
    const authResult = await authenticateAdminRequest(request);
    if (!authResult.success) {
      return adminAuthErrorResponse(authResult);
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const action = url.searchParams.get('action');
    const actorId = url.searchParams.get('actorId');
    const actorEmail = url.searchParams.get('actorEmail');
    const resourceType = url.searchParams.get('resourceType');
    const resourceId = url.searchParams.get('resourceId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    // Build where clause
    const where: Prisma.AuthAuditLogWhereInput = {};

    if (action) {
      where.action = action;
    }

    if (actorId) {
      where.actorId = actorId;
    }

    if (actorEmail) {
      where.actorEmail = { contains: actorEmail, mode: 'insensitive' };
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    if (resourceId) {
      where.resourceId = resourceId;
    }

    // Date range filter
    // Default to last 90 days if no date filter specified (for performance)
    if (dateFrom || dateTo) {
      where.timestamp = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    } else {
      // Apply default lookback period
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - DEFAULT_LOOKBACK_DAYS);
      where.timestamp = { gte: defaultFrom };
    }

    // Run parallel queries for logs and count
    const [logs, total] = await Promise.all([
      db.authAuditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          eventId: true,
          action: true,
          actorId: true,
          actorEmail: true,
          actorRole: true,
          ipAddress: true,
          resourceType: true,
          resourceId: true,
          timestamp: true,
          metadata: true,
        },
      }),
      db.authAuditLog.count({ where }),
    ]);

    // Serialize BigInt id to string for JSON
    const serialized = logs.map((log) => ({
      ...log,
      id: log.id.toString(),
    }));

    return Response.json({
      logs: serialized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Audit Logs] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
