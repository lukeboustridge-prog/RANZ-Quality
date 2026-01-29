export const runtime = 'nodejs';

/**
 * Migration Status API
 *
 * GET /api/admin/migration/status
 *
 * Returns the current migration status including:
 * - Summary counts by auth mode
 * - Clerk user count
 * - Cohort progress tracking
 * - Recent migrations
 *
 * Required role: RANZ_ADMIN only
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest, verifyToken } from '@/lib/auth';
import { getClerkUserCount } from '@/lib/auth/migration/clerk-export';

export async function GET(request: NextRequest) {
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

    // Check admin role (RANZ_ADMIN only for migration operations)
    if (payload.role !== 'RANZ_ADMIN') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get migration status counts in parallel
    const [
      totalAuthUsers,
      clerkModeUsers,
      customModeUsers,
      migratingUsers,
      pendingActivation,
      recentMigrations,
      clerkTotalCount,
      mappedToAuthUserCount,
    ] = await Promise.all([
      db.authUser.count(),
      db.authUser.count({ where: { authMode: 'CLERK' } }),
      db.authUser.count({ where: { authMode: 'CUSTOM' } }),
      db.authUser.count({ where: { authMode: 'MIGRATING' } }),
      db.authUser.count({ where: { status: 'PENDING_ACTIVATION' } }),
      db.authUser.findMany({
        where: {
          migratedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          authMode: 'CUSTOM',
        },
        select: { id: true, email: true, migratedAt: true, migratedBy: true },
        orderBy: { migratedAt: 'desc' },
        take: 10,
      }),
      getClerkUserCount().catch(() => 0),
      db.authUser.count({ where: { clerkUserId: { not: null } } }),
    ]);

    const percentComplete =
      totalAuthUsers > 0
        ? ((customModeUsers / totalAuthUsers) * 100).toFixed(1)
        : '0';

    return Response.json({
      summary: {
        totalAuthUsers,
        clerkModeUsers,
        customModeUsers,
        migratingUsers,
        pendingActivation,
        percentComplete: `${percentComplete}%`,
      },
      clerk: {
        totalClerkUsers: clerkTotalCount,
        mappedToAuthUser: mappedToAuthUserCount,
      },
      cohortProgress: {
        pilot: {
          target: 5,
          current: Math.min(customModeUsers, 5),
          complete: customModeUsers >= 5,
        },
        wave1: {
          target: 30,
          current: Math.min(customModeUsers, 30),
          complete: customModeUsers >= 30,
        },
        wave2: {
          target: 100,
          current: Math.min(customModeUsers, 100),
          complete: customModeUsers >= 100,
        },
        final: {
          target: totalAuthUsers,
          current: customModeUsers,
          complete: customModeUsers === totalAuthUsers,
        },
      },
      recentMigrations,
    });
  } catch (error) {
    console.error('Failed to get migration status:', error);
    return Response.json(
      { error: 'Failed to get migration status' },
      { status: 500 }
    );
  }
}
