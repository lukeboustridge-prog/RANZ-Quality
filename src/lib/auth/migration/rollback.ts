/**
 * Rollback Utilities
 *
 * Provides per-user and batch rollback from custom auth back to Clerk.
 * Rollback preserves all data - only changes authMode flag.
 * 24-hour rollback window is tracked with warnings for late rollbacks.
 *
 * Usage:
 * ```typescript
 * import { rollbackUserToClerk, rollbackMigrationWindow, getRecentlyMigratedUsers } from '@/lib/auth/migration/rollback';
 *
 * // Rollback single user
 * await rollbackUserToClerk(userId, adminId, 'User reported login issues');
 *
 * // Rollback users migrated in a time window
 * await rollbackMigrationWindow(startTime, endTime, adminId, 'Issues found with batch');
 *
 * // Get rollback candidates
 * const recent = await getRecentlyMigratedUsers(24); // Last 24 hours
 * ```
 */

import { db } from '@/lib/db';
import { logAuthEvent } from '@/lib/auth/audit';

/**
 * Rollback a user to Clerk authentication
 * Preserves all data - just changes auth mode flag
 */
export async function rollbackUserToClerk(
  userId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    const user = await db.authUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        authMode: true,
        clerkUserId: true,
        migratedAt: true,
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.clerkUserId) {
      return { success: false, error: 'User has no Clerk ID - cannot rollback' };
    }

    if (user.authMode === 'CLERK') {
      return { success: false, error: 'User is already using Clerk auth' };
    }

    // Check 24-hour rollback window
    let warning: string | undefined;
    if (user.migratedAt) {
      const hoursSinceMigration =
        (Date.now() - user.migratedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceMigration > 24) {
        warning = `Rollback outside 24-hour window (${hoursSinceMigration.toFixed(1)} hours since migration)`;

        // Log late rollback warning
        await logAuthEvent({
          action: 'MIGRATION_ROLLBACK_LATE',
          actorId: adminId,
          resourceType: 'AuthUser',
          resourceId: userId,
          metadata: {
            hoursSinceMigration,
            reason,
            note: 'Rollback outside 24-hour window',
          },
        });
      }
    }

    // Perform rollback in transaction
    await db.$transaction([
      // Update user auth mode
      db.authUser.update({
        where: { id: userId },
        data: {
          authMode: 'CLERK',
          migrationNotes: `Rolled back at ${new Date().toISOString()}: ${reason}`,
        },
      }),

      // Revoke any custom auth sessions
      db.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedBy: adminId,
          revokedReason: `Rollback to Clerk: ${reason}`,
        },
      }),
    ]);

    // Log the rollback
    await logAuthEvent({
      action: 'MIGRATION_ROLLBACK',
      actorId: adminId,
      resourceType: 'AuthUser',
      resourceId: userId,
      metadata: {
        userEmail: user.email,
        reason,
        previousMode: user.authMode,
      },
    });

    return { success: true, warning };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Bulk rollback all users migrated in a specific time window
 */
export async function rollbackMigrationWindow(
  startTime: Date,
  endTime: Date,
  adminId: string,
  reason: string
): Promise<{
  rolledBack: number;
  failed: number;
  errors: string[];
}> {
  const users = await db.authUser.findMany({
    where: {
      authMode: 'CUSTOM',
      migratedAt: {
        gte: startTime,
        lte: endTime,
      },
      clerkUserId: { not: null },
    },
    select: { id: true, email: true },
  });

  let rolledBack = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    const result = await rollbackUserToClerk(user.id, adminId, reason);
    if (result.success) {
      rolledBack++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${user.email}: ${result.error}`);
      }
    }
  }

  // Log batch rollback
  await logAuthEvent({
    action: 'MIGRATION_ROLLBACK_BATCH',
    actorId: adminId,
    resourceType: 'AuthUser',
    metadata: {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      reason,
      rolledBack,
      failed,
    },
  });

  return { rolledBack, failed, errors };
}

/**
 * Get users recently migrated (candidates for rollback)
 */
export async function getRecentlyMigratedUsers(
  hoursBack: number = 24
): Promise<Array<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  migratedAt: Date;
  migratedBy: string | null;
  hoursSinceMigration: number;
}>> {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const users = await db.authUser.findMany({
    where: {
      authMode: 'CUSTOM',
      migratedAt: { gte: cutoff },
      clerkUserId: { not: null },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      migratedAt: true,
      migratedBy: true,
    },
    orderBy: { migratedAt: 'desc' },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    migratedAt: u.migratedAt!,
    migratedBy: u.migratedBy,
    hoursSinceMigration: (Date.now() - u.migratedAt!.getTime()) / (1000 * 60 * 60),
  }));
}
