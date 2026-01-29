export const runtime = 'nodejs';

/**
 * Admin Activity Statistics Endpoint
 *
 * GET /api/admin/activity
 *
 * Returns aggregated activity statistics for security monitoring dashboard.
 * Includes login counts, failed attempts, daily trends, and recent activity.
 *
 * Required role: RANZ_ADMIN or RANZ_STAFF
 */

import { db } from '@/lib/db';
import { getSessionFromRequest, verifyToken } from '@/lib/auth';
import { AUTH_ACTIONS } from '@/lib/auth/audit';

// Type for raw query date aggregation results
interface DateCount {
  date: Date;
  count: number;
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
    const url = new URL(request.url);
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Parallel queries for efficiency
    const [
      totalLogins,
      uniqueUsers,
      failedAttempts,
      lockouts,
      passwordResets,
      loginsByDay,
      failedByDay,
      topActions,
      recentActivity,
    ] = await Promise.all([
      // Total successful logins
      db.authAuditLog.count({
        where: { action: AUTH_ACTIONS.LOGIN_SUCCESS, timestamp: { gte: dateFrom } },
      }),

      // Unique active users (distinct actors who logged in)
      db.authAuditLog.findMany({
        where: {
          action: AUTH_ACTIONS.LOGIN_SUCCESS,
          timestamp: { gte: dateFrom },
          actorId: { not: null },
        },
        distinct: ['actorId'],
        select: { actorId: true },
      }),

      // Failed login attempts
      db.authAuditLog.count({
        where: { action: AUTH_ACTIONS.LOGIN_FAILED, timestamp: { gte: dateFrom } },
      }),

      // Account lockouts
      db.authAuditLog.count({
        where: { action: AUTH_ACTIONS.ACCOUNT_LOCKED, timestamp: { gte: dateFrom } },
      }),

      // Password resets completed
      db.authAuditLog.count({
        where: { action: AUTH_ACTIONS.PASSWORD_RESET_COMPLETED, timestamp: { gte: dateFrom } },
      }),

      // Logins by day (for chart) - using raw query for date aggregation
      db.$queryRaw<DateCount[]>`
        SELECT DATE(timestamp) as date, COUNT(*)::int as count
        FROM "AuthAuditLog"
        WHERE action = ${AUTH_ACTIONS.LOGIN_SUCCESS} AND timestamp >= ${dateFrom}
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `,

      // Failed by day (for chart)
      db.$queryRaw<DateCount[]>`
        SELECT DATE(timestamp) as date, COUNT(*)::int as count
        FROM "AuthAuditLog"
        WHERE action = ${AUTH_ACTIONS.LOGIN_FAILED} AND timestamp >= ${dateFrom}
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `,

      // Top actions by count
      db.authAuditLog.groupBy({
        by: ['action'],
        where: { timestamp: { gte: dateFrom } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),

      // Recent activity (last 10 events)
      db.authAuditLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          action: true,
          actorEmail: true,
          resourceType: true,
          timestamp: true,
          ipAddress: true,
        },
      }),
    ]);

    // Format date aggregations for chart consumption
    const formatDateData = (data: DateCount[]) =>
      data.map((d) => ({
        date: d.date.toISOString().split('T')[0], // YYYY-MM-DD format
        count: d.count,
      }));

    return Response.json({
      summary: {
        totalLogins,
        uniqueActiveUsers: uniqueUsers.length,
        failedAttempts,
        accountLockouts: lockouts,
        passwordResets,
      },
      loginsByDay: formatDateData(loginsByDay),
      failedByDay: formatDateData(failedByDay),
      topActions: topActions.map((t) => ({
        action: t.action,
        count: t._count.action,
      })),
      recentActivity: recentActivity.map((a) => ({
        ...a,
        id: a.id.toString(), // BigInt serialization
      })),
    });
  } catch (error) {
    console.error('[Admin Activity] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
