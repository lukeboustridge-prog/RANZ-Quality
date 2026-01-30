export const runtime = 'nodejs';

/**
 * Admin User Batch Operations Endpoint
 *
 * POST /api/admin/users/batch
 *
 * Allows RANZ administrators to perform bulk operations on multiple users:
 * - deactivate: Deactivate selected users and revoke sessions
 * - reactivate: Reactivate selected users
 * - change_role: Change user type/role for selected users
 *
 * All operations are executed in a transaction for atomicity.
 *
 * Required role: RANZ_ADMIN only (batch ops are high-risk)
 */

import { db } from '@/lib/db';
import {
  getIPFromRequest,
  logAuthEvent,
  AUTH_ACTIONS,
  revokeAllUserSessions,
  type AuthAction,
} from '@/lib/auth';
import { authenticateAdminRequest, adminAuthErrorResponse } from '@/lib/auth/admin-api';
import { AuthUserType } from '@prisma/client';

/**
 * Maximum number of users allowed per batch operation.
 */
const MAX_BATCH_SIZE = 100;

/**
 * Supported batch actions.
 */
type BatchAction = 'deactivate' | 'reactivate' | 'change_role';

/**
 * Request body for batch operations.
 */
interface BatchRequest {
  action: BatchAction;
  userIds: string[];
  newRole?: AuthUserType;
  reason?: string;
}

/**
 * Result for a single user in the batch.
 */
interface BatchResult {
  userId: string;
  success: boolean;
  error?: string;
}

export async function POST(request: Request): Promise<Response> {
  const ip = getIPFromRequest(request);

  try {
    // Authenticate admin (RANZ_ADMIN only for batch operations)
    const authResult = await authenticateAdminRequest(request, ['RANZ_ADMIN']);
    if (!authResult.success) {
      return adminAuthErrorResponse(authResult);
    }

    const actorId = authResult.user.id;
    const actorEmail = authResult.user.email;
    const actorRole = authResult.user.userType;

    // Parse request body
    let body: BatchRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate action
    const validActions: BatchAction[] = ['deactivate', 'reactivate', 'change_role'];
    if (!body.action || !validActions.includes(body.action)) {
      return Response.json(
        { error: 'Invalid action', validActions },
        { status: 400 }
      );
    }

    // Validate userIds
    if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
      return Response.json({ error: 'userIds array is required' }, { status: 400 });
    }

    if (body.userIds.length > MAX_BATCH_SIZE) {
      return Response.json(
        { error: `Maximum ${MAX_BATCH_SIZE} users per batch operation` },
        { status: 400 }
      );
    }

    // Validate newRole for change_role action
    if (body.action === 'change_role') {
      if (!body.newRole || !Object.values(AuthUserType).includes(body.newRole)) {
        return Response.json(
          { error: 'Invalid newRole', validRoles: Object.values(AuthUserType) },
          { status: 400 }
        );
      }
    }

    const results: BatchResult[] = [];
    const updatedIds: string[] = [];
    const failedIds: Array<{ userId: string; error: string }> = [];

    // Execute batch operation in transaction
    await db.$transaction(async (tx) => {
      for (const userId of body.userIds) {
        try {
          // Find user
          const user = await tx.authUser.findUnique({
            where: { id: userId },
            select: { id: true, email: true, status: true, userType: true },
          });

          if (!user) {
            failedIds.push({ userId, error: 'User not found' });
            results.push({ userId, success: false, error: 'User not found' });
            continue;
          }

          if (body.action === 'deactivate') {
            // Deactivate user
            await tx.authUser.update({
              where: { id: userId },
              data: {
                status: 'DEACTIVATED',
                deactivatedAt: new Date(),
                deactivatedBy: actorId,
                deactivationReason: body.reason || 'Batch deactivation',
              },
            });

            // Revoke all sessions
            await tx.authSession.updateMany({
              where: { userId, revokedAt: null },
              data: {
                revokedAt: new Date(),
                revokedBy: actorId,
                revokedReason: 'Batch deactivation',
              },
            });

            updatedIds.push(userId);
            results.push({ userId, success: true });
          } else if (body.action === 'reactivate') {
            // Reactivate user
            if (user.status !== 'DEACTIVATED') {
              failedIds.push({ userId, error: 'User is not deactivated' });
              results.push({ userId, success: false, error: 'User is not deactivated' });
              continue;
            }

            await tx.authUser.update({
              where: { id: userId },
              data: {
                status: 'ACTIVE',
                deactivatedAt: null,
                deactivatedBy: null,
                deactivationReason: null,
              },
            });

            updatedIds.push(userId);
            results.push({ userId, success: true });
          } else if (body.action === 'change_role') {
            // Change role
            const previousRole = user.userType;

            await tx.authUser.update({
              where: { id: userId },
              data: { userType: body.newRole! },
            });

            updatedIds.push(userId);
            results.push({ userId, success: true });

            // Log individual role change for detailed audit trail
            await logAuthEvent({
              action: AUTH_ACTIONS.USER_ROLE_CHANGED,
              actorId,
              actorEmail,
              actorRole,
              ipAddress: ip,
              resourceType: 'AuthUser',
              resourceId: userId,
              previousState: { userType: previousRole },
              newState: { userType: body.newRole },
              metadata: { batchOperation: true },
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failedIds.push({ userId, error: errorMessage });
          results.push({ userId, success: false, error: errorMessage });
        }
      }
    });

    // Determine audit action
    let auditAction: AuthAction;
    switch (body.action) {
      case 'deactivate':
        auditAction = AUTH_ACTIONS.USER_BATCH_UPDATED;
        break;
      case 'reactivate':
        auditAction = AUTH_ACTIONS.USER_BATCH_UPDATED;
        break;
      case 'change_role':
        auditAction = AUTH_ACTIONS.USER_BATCH_UPDATED;
        break;
      default:
        auditAction = AUTH_ACTIONS.USER_BATCH_UPDATED;
    }

    // Log batch operation event
    await logAuthEvent({
      action: auditAction,
      actorId,
      actorEmail,
      actorRole,
      ipAddress: ip,
      resourceType: 'AuthUser',
      metadata: {
        operation: body.action,
        requestedCount: body.userIds.length,
        successCount: updatedIds.length,
        failedCount: failedIds.length,
        newRole: body.action === 'change_role' ? body.newRole : undefined,
        reason: body.reason,
        failedIds: failedIds.length > 0 ? failedIds : undefined,
      },
    });

    return Response.json({
      success: true,
      action: body.action,
      updated: updatedIds.length,
      failed: failedIds.length,
      results,
    });
  } catch (error) {
    console.error('[Admin Batch Operations] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
