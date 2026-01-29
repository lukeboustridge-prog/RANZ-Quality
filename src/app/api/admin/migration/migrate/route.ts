export const runtime = 'nodejs';

/**
 * Migration API Endpoint
 *
 * POST /api/admin/migration/migrate - Trigger user migration
 * GET /api/admin/migration/migrate - Get migration preview/progress
 *
 * Required role: RANZ_ADMIN
 *
 * Modes:
 * - single: Migrate individual user
 * - cohort: Migrate next cohort batch
 * - preview: Get current progress and eligible users
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest, verifyToken } from '@/lib/auth';
import {
  migrateUserToCustom,
  migrateNextCohort,
  getMigrationProgress,
  getEligibleUsersForMigration,
  type RolloutCohort,
} from '@/lib/auth/migration/gradual-rollout';

const migrateSchema = z.object({
  mode: z.enum(['single', 'cohort', 'preview']),
  userId: z.string().optional(), // For single mode
  cohort: z.enum(['pilot', 'wave1', 'wave2', 'final']).optional(), // For cohort mode
  notes: z.string().optional(),
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

  // Check RANZ_ADMIN role (migration is high-privilege)
  if (payload.role !== 'RANZ_ADMIN') {
    return Response.json({ error: 'Unauthorized - RANZ_ADMIN required' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = migrateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
  }

  const { mode, userId, cohort, notes } = parsed.data;

  try {
    if (mode === 'preview') {
      // Preview: show migration progress and eligible users
      const [progress, eligible] = await Promise.all([
        getMigrationProgress(),
        getEligibleUsersForMigration(20),
      ]);

      return Response.json({
        mode: 'preview',
        progress,
        eligibleUsers: eligible,
        nextCohort: progress.cohortComplete
          ? getNextCohort(progress.currentCohort)
          : progress.currentCohort,
      });
    }

    if (mode === 'single' && userId) {
      // Migrate single user
      const result = await migrateUserToCustom(userId, payload.sub, notes);
      return Response.json({ mode: 'single', userId, ...result });
    }

    if (mode === 'cohort' && cohort) {
      // Migrate next cohort
      const result = await migrateNextCohort(cohort, payload.sub);
      return Response.json({ mode: 'cohort', cohort, ...result });
    }

    return Response.json({ error: 'Invalid mode or missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Migration failed:', error);
    return Response.json({ error: 'Migration failed' }, { status: 500 });
  }
}

function getNextCohort(current: RolloutCohort): RolloutCohort | null {
  const order: RolloutCohort[] = ['pilot', 'wave1', 'wave2', 'final'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
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

  // Return migration preview by default
  const [progress, eligible] = await Promise.all([
    getMigrationProgress(),
    getEligibleUsersForMigration(10),
  ]);

  return Response.json({
    progress,
    eligibleUsers: eligible,
    nextCohort: progress.cohortComplete
      ? getNextCohort(progress.currentCohort)
      : progress.currentCohort,
  });
}
