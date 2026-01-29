/**
 * Session Validation API
 *
 * Endpoint for satellite applications to validate session cookies.
 * Used for critical operations that require immediate revocation awareness.
 *
 * This endpoint is public (no auth required) because it validates the provided cookie.
 * Satellite apps call this to confirm session is still valid before sensitive operations.
 *
 * Requirements:
 * - XAPP-03: Session validation for satellite apps
 * - XAPP-04: Revocation-aware validation
 */

export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, parseSessionCookie } from '@/lib/auth';

/**
 * GET /api/auth/validate-session
 *
 * Validates the session cookie and checks if session is still active.
 * Returns session validity, user ID, session ID, and expiration.
 *
 * Response codes:
 * - 200: Session is valid
 * - 401: Session is invalid (no token, invalid token, revoked, expired)
 */
export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');

  // Parse the session token from cookies
  const token = parseSessionCookie(cookieHeader);

  if (!token) {
    return Response.json(
      { valid: false, reason: 'no_token' },
      { status: 401 }
    );
  }

  // Verify the JWT signature and claims
  const payload = await verifyToken(token);

  if (!payload) {
    return Response.json(
      { valid: false, reason: 'invalid_token' },
      { status: 401 }
    );
  }

  // Check session exists and is not revoked in database
  try {
    const session = await db.authSession.findUnique({
      where: { id: payload.sessionId },
      select: {
        revokedAt: true,
        expiresAt: true,
      },
    });

    if (!session) {
      return Response.json(
        { valid: false, reason: 'session_not_found' },
        { status: 401 }
      );
    }

    if (session.revokedAt) {
      return Response.json(
        { valid: false, reason: 'session_revoked' },
        { status: 401 }
      );
    }

    if (new Date() >= session.expiresAt) {
      return Response.json(
        { valid: false, reason: 'session_expired' },
        { status: 401 }
      );
    }

    // Session is valid
    return Response.json({
      valid: true,
      userId: payload.sub,
      sessionId: payload.sessionId,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    // Database error - log and return generic error
    console.error('Session validation database error:', error);
    return Response.json(
      { valid: false, reason: 'validation_error' },
      { status: 500 }
    );
  }
}
