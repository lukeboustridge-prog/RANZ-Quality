/**
 * Password Reset Completion Endpoint
 *
 * POST /api/auth/reset-password
 *
 * Allows users to complete a password reset using a valid token from the
 * password reset email. The token is single-use and expires after 1 hour.
 *
 * Requirements:
 * - AUTH-04: Password reset via email with 1-hour token expiry
 * - SECR-04: Password complexity validation
 * - SECR-02: All password operations logged
 * - OWASP: Single-use tokens, no auto-login after reset
 */

export const runtime = 'nodejs';

import { db } from '@/lib/db';
import {
  validatePasswordResetToken,
  hashPassword,
  validatePasswordComplexity,
  sendPasswordChangedEmail,
  logAuthEvent,
  AUTH_ACTIONS,
  getIPFromRequest,
} from '@/lib/auth';

/** Request body shape */
interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export async function POST(request: Request): Promise<Response> {
  const ip = getIPFromRequest(request);

  try {
    // Parse request body
    let body: ResetPasswordRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { token, newPassword } = body;

    // Validate required fields
    if (!token || typeof token !== 'string') {
      return Response.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return Response.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    // Validate the token
    const validation = await validatePasswordResetToken(token);

    if (!validation.valid || !validation.userId) {
      // Log failed attempt
      await logAuthEvent({
        action: AUTH_ACTIONS.PASSWORD_RESET_FAILED,
        ipAddress: ip,
        metadata: {
          reason: validation.reason,
          tokenProvided: !!token,
        },
      });

      // Provide user-friendly error messages
      let errorMessage = 'Invalid or expired reset link';
      if (validation.reason === 'token_expired') {
        errorMessage = 'This reset link has expired. Please request a new one.';
      } else if (validation.reason === 'token_already_used') {
        errorMessage = 'This reset link has already been used. Please request a new one.';
      }

      return Response.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Validate password complexity (SECR-04)
    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.valid) {
      return Response.json(
        {
          error: 'Password does not meet requirements',
          requirements: complexity.errors,
        },
        { status: 400 }
      );
    }

    // Get user for logging and email
    const user = await db.authUser.findUnique({
      where: { id: validation.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    });

    if (!user) {
      // User was deleted after token was created
      await logAuthEvent({
        action: AUTH_ACTIONS.PASSWORD_RESET_FAILED,
        ipAddress: ip,
        metadata: {
          reason: 'user_not_found',
          userId: validation.userId,
        },
      });

      return Response.json(
        { error: 'Account not found' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = hashPassword(newPassword);

    // Transaction to ensure atomicity:
    // 1. Update user password and clear mustChangePassword flag
    // 2. Consume all unused tokens for this user (prevent reuse)
    await db.$transaction([
      // Update user password and reset failed attempts
      db.authUser.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      // Consume all unused tokens for this user
      db.authPasswordReset.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
          usedIp: ip,
        },
      }),
    ]);

    // Send password changed confirmation email
    const emailResult = await sendPasswordChangedEmail({
      to: user.email,
      firstName: user.firstName ?? 'Member',
      changedAt: new Date().toISOString(),
      changedIp: ip,
    });

    // Log successful password reset
    await logAuthEvent({
      action: AUTH_ACTIONS.PASSWORD_RESET_COMPLETED,
      actorId: user.id,
      actorEmail: user.email,
      ipAddress: ip,
      resourceType: 'AuthUser',
      resourceId: user.id,
      metadata: {
        emailSent: !emailResult.error,
        emailError: emailResult.error,
      },
    });

    // Return success - DO NOT auto-login per OWASP guidelines
    return Response.json({
      success: true,
      message: 'Password has been reset. Please log in with your new password.',
    });
  } catch (error) {
    // Log error
    console.error('[reset-password] Error processing request:', error);

    await logAuthEvent({
      action: AUTH_ACTIONS.PASSWORD_RESET_FAILED,
      ipAddress: ip,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return Response.json(
      { error: 'An error occurred while resetting your password. Please try again.' },
      { status: 500 }
    );
  }
}
