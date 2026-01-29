export const runtime = 'nodejs';

/**
 * Rollback API Endpoint
 *
 * POST /api/admin/migration/rollback - Trigger user rollback
 * GET /api/admin/migration/rollback - Get rollback candidates
 *
 * Required role: RANZ_ADMIN
 *
 * Modes:
 * - single: Rollback individual user
 * - window: Rollback users migrated in time window
 * - preview: Get recently migrated users (rollback candidates)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest, verifyToken } from '@/lib/auth';
import {
  rollbackUserToClerk,
  rollbackMigrationWindow,
  getRecentlyMigratedUsers,
} from '@/lib/auth/migration/rollback';

const rollbackSchema = z.object({
  mode: z.enum(['single', 'window', 'preview']),
  userId: z.string().optional(), // For single mode
  startTime: z.string().datetime().optional(), // For window mode
  endTime: z.string().datetime().optional(), // For window mode
  reason: z.string().min(1),
});

export async function POST(request: NextRequest) {
  // Authenticate admin
  const sessionToken = getSessionFromRequest(request);
  if (!sessionToken) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyToken(sessionToken);
  if (!payload) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  // Check RANZ_ADMIN role (rollback is high-privilege)
  if (payload.role !== 'RANZ_ADMIN') {
    return Response.json({ error: 'Unauthorized - RANZ_ADMIN required' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = rollbackSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
  }

  const { mode, userId, startTime, endTime, reason } = parsed.data;

  try {
    if (mode === 'preview') {
      // Preview: show recently migrated users eligible for rollback
      const recentUsers = await getRecentlyMigratedUsers(48); // 48 hours

      return Response.json({
        mode: 'preview',
        recentlyMigrated: recentUsers,
        within24Hours: recentUsers.filter((u) => u.hoursSinceMigration <= 24).length,
        outside24Hours: recentUsers.filter((u) => u.hoursSinceMigration > 24).length,
      });
    }

    if (mode === 'single' && userId) {
      // Rollback single user
      const result = await rollbackUserToClerk(userId, payload.sub, reason);
      return Response.json({ mode: 'single', userId, ...result });
    }

    if (mode === 'window' && startTime && endTime) {
      // Rollback users migrated in time window
      const result = await rollbackMigrationWindow(
        new Date(startTime),
        new Date(endTime),
        payload.sub,
        reason
      );
      return Response.json({ mode: 'window', startTime, endTime, ...result });
    }

    return Response.json({ error: 'Invalid mode or missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Rollback failed:', error);
    return Response.json({ error: 'Rollback failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Authenticate admin
  const sessionToken = getSessionFromRequest(request);
  if (!sessionToken) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyToken(sessionToken);
  if (!payload) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  // Check RANZ_ADMIN role
  if (payload.role !== 'RANZ_ADMIN') {
    return Response.json({ error: 'Unauthorized - RANZ_ADMIN required' }, { status: 403 });
  }

  // Return rollback candidates
  const recentUsers = await getRecentlyMigratedUsers(48);

  return Response.json({
    recentlyMigrated: recentUsers,
    within24Hours: recentUsers.filter((u) => u.hoursSinceMigration <= 24).length,
    outside24Hours: recentUsers.filter((u) => u.hoursSinceMigration > 24).length,
  });
}
