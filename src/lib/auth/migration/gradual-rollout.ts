/**
 * Gradual Rollout Utilities
 *
 * Implements cohort-based migration from Clerk to custom auth.
 * Cohorts: pilot (5) -> wave1 (30) -> wave2 (100) -> final (all)
 *
 * Usage:
 * ```typescript
 * import { getMigrationProgress, migrateUserToCustom, migrateNextCohort } from '@/lib/auth/migration/gradual-rollout';
 *
 * // Check progress
 * const progress = await getMigrationProgress();
 *
 * // Migrate single user
 * await migrateUserToCustom(userId, adminId, 'Pilot test');
 *
 * // Migrate next cohort
 * await migrateNextCohort('wave1', adminId);
 * ```
 */

import { db } from '@/lib/db';
import { logAuthEvent } from '@/lib/auth/audit';
import type { AuthMode } from '@prisma/client';

export type RolloutCohort = 'pilot' | 'wave1' | 'wave2' | 'final';

export const COHORT_SIZES: Record<RolloutCohort, number> = {
  pilot: 5,
  wave1: 30,
  wave2: 100,
  final: Infinity, // All remaining
};

export interface MigrationProgress {
  totalUsers: number;
  clerkUsers: number;
  customUsers: number;
  migratingUsers: number;
  currentCohort: RolloutCohort;
  cohortComplete: boolean;
  percentComplete: string;
}

/**
 * Get current migration progress
 */
export async function getMigrationProgress(): Promise<MigrationProgress> {
  const [total, clerk, custom, migrating] = await Promise.all([
    db.authUser.count(),
    db.authUser.count({ where: { authMode: 'CLERK' } }),
    db.authUser.count({ where: { authMode: 'CUSTOM' } }),
    db.authUser.count({ where: { authMode: 'MIGRATING' } }),
  ]);

  // Determine current cohort based on migrated count
  let currentCohort: RolloutCohort = 'pilot';
  let cohortComplete = false;

  if (custom >= COHORT_SIZES.wave2) {
    currentCohort = 'final';
    cohortComplete = custom === total;
  } else if (custom >= COHORT_SIZES.wave1) {
    currentCohort = 'wave2';
    cohortComplete = custom >= COHORT_SIZES.wave2;
  } else if (custom >= COHORT_SIZES.pilot) {
    currentCohort = 'wave1';
    cohortComplete = custom >= COHORT_SIZES.wave1;
  } else {
    cohortComplete = custom >= COHORT_SIZES.pilot;
  }

  return {
    totalUsers: total,
    clerkUsers: clerk,
    customUsers: custom,
    migratingUsers: migrating,
    currentCohort,
    cohortComplete,
    percentComplete: total > 0 ? ((custom / total) * 100).toFixed(1) : '0',
  };
}

/**
 * Migrate a single user from Clerk to Custom auth
 */
export async function migrateUserToCustom(
  userId: string,
  adminId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await db.authUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        authMode: true,
        passwordHash: true,
        clerkUserId: true,
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.authMode === 'CUSTOM') {
      return { success: false, error: 'User is already using custom auth' };
    }

    if (!user.clerkUserId) {
      return { success: false, error: 'User has no Clerk ID - cannot migrate' };
    }

    // Determine if password reset is needed
    const requirePasswordReset = !user.passwordHash;

    // Update user to CUSTOM auth mode
    await db.authUser.update({
      where: { id: userId },
      data: {
        authMode: 'CUSTOM',
        migratedAt: new Date(),
        migratedBy: adminId,
        migrationNotes: notes || null,
        mustChangePassword: requirePasswordReset,
      },
    });

    // Revoke any existing sessions (force re-login with custom auth)
    await db.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedBy: adminId,
        revokedReason: 'Migrated to custom authentication',
      },
    });

    // Log the migration
    await logAuthEvent({
      action: 'MIGRATION_USER_TO_CUSTOM',
      actorId: adminId,
      resourceType: 'AuthUser',
      resourceId: userId,
      metadata: {
        userEmail: user.email,
        requirePasswordReset,
        notes,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Migrate next cohort of users to custom auth
 */
export async function migrateNextCohort(
  cohort: RolloutCohort,
  adminId: string
): Promise<{
  migrated: number;
  failed: number;
  errors: string[];
  targetReached: boolean;
}> {
  const targetSize = COHORT_SIZES[cohort];
  const errors: string[] = [];
  let migrated = 0;
  let failed = 0;

  // Get current count of CUSTOM users
  const currentCustomCount = await db.authUser.count({
    where: { authMode: 'CUSTOM' },
  });

  // Calculate how many more to migrate
  const toMigrate = Math.min(
    targetSize - currentCustomCount,
    targetSize === Infinity ? 1000 : targetSize // Batch limit for 'final'
  );

  if (toMigrate <= 0) {
    return {
      migrated: 0,
      failed: 0,
      errors: ['Cohort target already reached'],
      targetReached: true,
    };
  }

  // Get users still on CLERK auth, prioritize by last login (active users first)
  const usersToMigrate = await db.authUser.findMany({
    where: { authMode: 'CLERK' },
    take: toMigrate,
    orderBy: { lastLoginAt: { sort: 'desc', nulls: 'last' } },
    select: { id: true, email: true },
  });

  // Migrate each user
  for (const user of usersToMigrate) {
    const result = await migrateUserToCustom(user.id, adminId, `Cohort: ${cohort}`);

    if (result.success) {
      migrated++;
    } else {
      failed++;
      errors.push(`${user.email}: ${result.error}`);
    }
  }

  // Log cohort migration
  await logAuthEvent({
    action: 'MIGRATION_COHORT_COMPLETE',
    actorId: adminId,
    resourceType: 'AuthUser',
    metadata: {
      cohort,
      targetSize,
      migrated,
      failed,
    },
  });

  // Check if target reached
  const newCustomCount = await db.authUser.count({
    where: { authMode: 'CUSTOM' },
  });

  return {
    migrated,
    failed,
    errors,
    targetReached: newCustomCount >= targetSize,
  };
}

/**
 * Get users eligible for next cohort migration
 */
export async function getEligibleUsersForMigration(
  limit: number = 10
): Promise<Array<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  lastLoginAt: Date | null;
  hasPassword: boolean;
}>> {
  const users = await db.authUser.findMany({
    where: { authMode: 'CLERK' },
    take: limit,
    orderBy: { lastLoginAt: { sort: 'desc', nulls: 'last' } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      lastLoginAt: true,
      passwordHash: true,
    },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    lastLoginAt: u.lastLoginAt,
    hasPassword: !!u.passwordHash,
  }));
}
