/**
 * Password Reset Request Endpoint
 *
 * POST /api/auth/forgot-password
 *
 * Allows users to request a password reset email. Always returns the same
 * response regardless of whether the email exists in the system to prevent
 * user enumeration attacks.
 *
 * Requirements:
 * - AUTH-04: Password reset via email with 1-hour token expiry
 * - SECR-02: All password operations logged
 * - No user enumeration (same response for all requests)
 */

export const runtime = 'nodejs';

import { db } from '@/lib/db';
import {
  checkRateLimit,
  authRateLimiters,
  getRateLimitIdentifier,
  getIPFromRequest,
  generatePasswordResetToken,
  sendPasswordResetEmail,
  logAuthEvent,
  AUTH_ACTIONS,
} from '@/lib/auth';

/** Request body shape */
interface ForgotPasswordRequest {
  email: string;
}

/** Standard success response - same for all requests */
const SUCCESS_RESPONSE = {
  success: true,
  message: 'If an account exists with that email, you will receive a password reset link.',
};

export async function POST(request: Request): Promise<Response> {
  const ip = getIPFromRequest(request);

  try {
    // Parse request body
    let body: ForgotPasswordRequest;
    try {
      body = await request.json();
    } catch {
      // Even malformed requests get the same response to prevent enumeration
      return Response.json(SUCCESS_RESPONSE);
    }

    const { email } = body;

    // Basic email validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      // Same response to prevent enumeration
      return Response.json(SUCCESS_RESPONSE);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit check per email to prevent harassment
    const identifier = getRateLimitIdentifier(request, normalizedEmail);
    const rateLimit = await checkRateLimit(authRateLimiters.passwordReset, identifier);

    if (!rateLimit.allowed) {
      // Still return success message to prevent enumeration
      // but don't actually send email or create token
      await logAuthEvent({
        action: AUTH_ACTIONS.PASSWORD_RESET_REQUESTED,
        actorEmail: normalizedEmail,
        ipAddress: ip,
        metadata: {
          rateLimited: true,
          retryAfter: rateLimit.retryAfter,
        },
      });
      return Response.json(SUCCESS_RESPONSE);
    }

    // Find user with minimal data exposure
    const user = await db.authUser.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        firstName: true,
        email: true,
        status: true,
      },
    });

    // Process only for active users
    if (user && user.status === 'ACTIVE') {
      // Generate token (this also invalidates previous tokens and creates DB record)
      const { token, expiresAt } = await generatePasswordResetToken(user.id, ip);

      // Build reset URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.ranz.co.nz';
      const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

      // Send password reset email
      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName ?? 'Member',
        resetUrl,
        requestedIp: ip,
      });

      // Log the request (fire-and-forget)
      await logAuthEvent({
        action: AUTH_ACTIONS.PASSWORD_RESET_REQUESTED,
        actorId: user.id,
        actorEmail: user.email,
        ipAddress: ip,
        resourceType: 'AuthUser',
        resourceId: user.id,
        metadata: {
          tokenExpiry: expiresAt.toISOString(),
          emailSent: !emailResult.error,
          emailError: emailResult.error,
        },
      });
    } else {
      // Log for security monitoring even when user doesn't exist
      await logAuthEvent({
        action: AUTH_ACTIONS.PASSWORD_RESET_REQUESTED,
        actorEmail: normalizedEmail,
        ipAddress: ip,
        metadata: {
          userExists: !!user,
          userStatus: user?.status ?? null,
        },
      });
    }

    // Always return the same response to prevent enumeration
    return Response.json(SUCCESS_RESPONSE);
  } catch (error) {
    // Log error but still return success to prevent enumeration
    console.error('[forgot-password] Error processing request:', error);

    await logAuthEvent({
      action: AUTH_ACTIONS.PASSWORD_RESET_REQUESTED,
      ipAddress: ip,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    // Same response even on errors to prevent enumeration
    return Response.json(SUCCESS_RESPONSE);
  }
}
