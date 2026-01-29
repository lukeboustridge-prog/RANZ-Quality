export const runtime = 'nodejs';

/**
 * Migration Import API
 *
 * POST /api/admin/migration/import
 *
 * Import/map Clerk users to AuthUser records.
 * Supports three modes:
 * - single: Import one user by clerkUserId
 * - batch: Import specific users by array of clerkUserIds
 * - all: Import all Clerk users
 *
 * Required role: RANZ_ADMIN only
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest, verifyToken, logAuthEvent } from '@/lib/auth';
import {
  exportClerkUsers,
  exportClerkUser,
} from '@/lib/auth/migration/clerk-export';
import {
  mapClerkUserToAuthUser,
  batchMapClerkUsers,
} from '@/lib/auth/migration/user-mapper';

/**
 * Request body schema for import endpoint.
 */
const importSchema = z.object({
  /** Import mode: single user, batch of users, or all users */
  mode: z.enum(['single', 'batch', 'all']),
  /** Clerk user ID for single mode */
  clerkUserId: z.string().optional(),
  /** Array of Clerk user IDs for batch mode */
  clerkUserIds: z.array(z.string()).optional(),
  /** Auth mode to set for imported users (default: CLERK) */
  setAuthMode: z.enum(['CLERK', 'CUSTOM', 'MIGRATING']).default('CLERK'),
  /** Whether to require password reset on first login (default: true) */
  requirePasswordReset: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const parsed = importSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { mode, clerkUserId, clerkUserIds, setAuthMode, requirePasswordReset } =
      parsed.data;

    // Build mapping options
    const options = {
      setAuthMode,
      requirePasswordReset,
      migratedBy: payload.sub,
    };

    let result;

    if (mode === 'single' && clerkUserId) {
      // Import single user
      const clerkUser = await exportClerkUser(clerkUserId);
      if (!clerkUser) {
        return Response.json(
          { error: `Clerk user ${clerkUserId} not found` },
          { status: 404 }
        );
      }

      const mappingResult = await mapClerkUserToAuthUser(clerkUser, options);

      // Log the migration action
      await logAuthEvent({
        action: 'MIGRATION_IMPORT_SINGLE',
        actorId: payload.sub,
        actorEmail: payload.email,
        resourceType: 'AuthUser',
        resourceId: mappingResult.authUserId || clerkUserId,
        metadata: JSON.parse(
          JSON.stringify({ clerkUserId, setAuthMode, ...mappingResult })
        ),
      });

      result = { mode: 'single', ...mappingResult };
    } else if (mode === 'batch' && clerkUserIds && clerkUserIds.length > 0) {
      // Import batch of users
      const clerkUsers = await Promise.all(
        clerkUserIds.map((id) => exportClerkUser(id))
      );
      const validUsers = clerkUsers.filter(
        (u): u is NonNullable<typeof u> => u !== null
      );

      const batchResult = await batchMapClerkUsers(validUsers, options);

      // Log the migration action
      await logAuthEvent({
        action: 'MIGRATION_IMPORT_BATCH',
        actorId: payload.sub,
        actorEmail: payload.email,
        resourceType: 'AuthUser',
        metadata: JSON.parse(
          JSON.stringify({
            requestedCount: clerkUserIds.length,
            setAuthMode,
            created: batchResult.created,
            updated: batchResult.updated,
            skipped: batchResult.skipped,
            errors: batchResult.errors,
          })
        ),
      });

      result = {
        mode: 'batch',
        created: batchResult.created,
        updated: batchResult.updated,
        skipped: batchResult.skipped,
        errors: batchResult.errors,
      };
    } else if (mode === 'all') {
      // Import all Clerk users
      const allClerkUsers = await exportClerkUsers();
      const batchResult = await batchMapClerkUsers(allClerkUsers, options);

      // Log the migration action
      await logAuthEvent({
        action: 'MIGRATION_IMPORT_ALL',
        actorId: payload.sub,
        actorEmail: payload.email,
        resourceType: 'AuthUser',
        metadata: JSON.parse(
          JSON.stringify({
            totalClerkUsers: allClerkUsers.length,
            setAuthMode,
            created: batchResult.created,
            updated: batchResult.updated,
            skipped: batchResult.skipped,
            errors: batchResult.errors,
          })
        ),
      });

      result = {
        mode: 'all',
        created: batchResult.created,
        updated: batchResult.updated,
        skipped: batchResult.skipped,
        errors: batchResult.errors,
      };
    } else {
      return Response.json(
        { error: 'Invalid mode or missing parameters' },
        { status: 400 }
      );
    }

    return Response.json(result);
  } catch (error) {
    console.error('Migration import failed:', error);
    return Response.json({ error: 'Migration import failed' }, { status: 500 });
  }
}
