/**
 * Authenticated Password Change Endpoint
 *
 * POST /api/auth/change-password
 *
 * Allows authenticated users to change their password. Supports both:
 * - Normal password change (requires current password)
 * - First-login forced password change (AUTH-03)
 *
 * Requirements:
 * - AUTH-03: First-login forced password change support
 * - SECR-04: Password complexity validation
 * - SECR-02: All password operations logged
 */

export const runtime = 'nodejs';

import { db } from '@/lib/db';
import {
  getSessionFromRequest,
  verifyToken,
  verifyPassword,
  hashPassword,
  validatePasswordComplexity,
  sendPasswordChangedEmail,
  logAuthEvent,
  AUTH_ACTIONS,
  getIPFromRequest,
} from '@/lib/auth';

/** Request body shape */
interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

export async function POST(request: Request): Promise<Response> {
  const ip = getIPFromRequest(request);

  try {
    // Get and verify session token
    const token = getSessionFromRequest(request);
    if (!token) {
      return Response.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Parse request body
    let body: ChangePasswordRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = body;

    // Validate new password is provided
    if (!newPassword || typeof newPassword !== 'string') {
      return Response.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    // Get user with current password hash
    const user = await db.authUser.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        passwordHash: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password (except for first-login flow when no current password provided)
    const isFirstLoginFlow = user.mustChangePassword && !currentPassword;

    if (!isFirstLoginFlow) {
      // Normal password change - require current password
      if (!currentPassword || typeof currentPassword !== 'string') {
        return Response.json(
          { error: 'Current password is required' },
          { status: 400 }
        );
      }

      // Verify current password
      if (!user.passwordHash) {
        return Response.json(
          { error: 'Account has no password set' },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        await logAuthEvent({
          action: AUTH_ACTIONS.PASSWORD_CHANGED,
          actorId: user.id,
          actorEmail: user.email,
          ipAddress: ip,
          resourceType: 'AuthUser',
          resourceId: user.id,
          metadata: {
            success: false,
            reason: 'incorrect_current_password',
          },
        });

        return Response.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
    }

    // Validate new password complexity (SECR-04)
    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.valid) {
      return Response.json(
        {
          error: 'New password does not meet requirements',
          requirements: complexity.errors,
        },
        { status: 400 }
      );
    }

    // Prevent password reuse - check if new password matches current
    if (user.passwordHash) {
      const isSamePassword = verifyPassword(newPassword, user.passwordHash);
      if (isSamePassword) {
        return Response.json(
          { error: 'New password must be different from current password' },
          { status: 400 }
        );
      }
    }

    // Hash and update password
    const hashedPassword = hashPassword(newPassword);
    const wasFirstLogin = user.mustChangePassword;

    await db.authUser.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: false, // Clear first-login flag
      },
    });

    // Log appropriate event type
    const action = wasFirstLogin
      ? AUTH_ACTIONS.FIRST_LOGIN_PASSWORD_CHANGE
      : AUTH_ACTIONS.PASSWORD_CHANGED;

    await logAuthEvent({
      action,
      actorId: user.id,
      actorEmail: user.email,
      ipAddress: ip,
      resourceType: 'AuthUser',
      resourceId: user.id,
      metadata: {
        success: true,
        wasFirstLogin,
      },
    });

    // Send confirmation email
    const emailResult = await sendPasswordChangedEmail({
      to: user.email,
      firstName: user.firstName ?? 'Member',
      changedAt: new Date().toISOString(),
      changedIp: ip,
    });

    if (emailResult.error) {
      console.error('[change-password] Failed to send confirmation email:', emailResult.error);
    }

    return Response.json({
      success: true,
      message: 'Password changed successfully.',
      wasFirstLogin,
    });
  } catch (error) {
    // Log error
    console.error('[change-password] Error processing request:', error);

    await logAuthEvent({
      action: AUTH_ACTIONS.PASSWORD_CHANGED,
      ipAddress: ip,
      metadata: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return Response.json(
      { error: 'An error occurred while changing your password. Please try again.' },
      { status: 500 }
    );
  }
}
