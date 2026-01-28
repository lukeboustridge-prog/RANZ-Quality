/**
 * POST /api/auth/logout
 *
 * Terminates user session(s) by revoking in database and clearing the session cookie.
 *
 * Request body (optional):
 * - scope: 'current' | 'all' (default: 'current')
 *   - 'current': Revoke only the current session
 *   - 'all': Revoke ALL sessions for this user (cross-app logout)
 *
 * Security features:
 * - Session revoked in database (not just cookie cleared)
 * - Cross-app logout support for XAPP-05
 * - Logout event logged to AuthAuditLog
 * - Cookie always cleared regardless of token state (defensive design)
 *
 * Requirements:
 * - AUTH-07: Logout from any page
 * - XAPP-05: Logging out from one app logs user out from all apps
 * - SECR-01: Audit logging
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getSessionFromRequest,
  clearSessionCookie,
  verifyToken,
  logAuthEvent,
  AUTH_ACTIONS,
  getIPFromRequest,
  revokeAllUserSessions,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  const ip = getIPFromRequest(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    // Parse scope from request body
    let scope: 'current' | 'all' = 'current';
    try {
      const body = await request.json();
      if (body.scope === 'all') {
        scope = 'all';
      }
    } catch {
      // No body or invalid JSON - use default scope
    }

    // Get token from request
    const token = getSessionFromRequest(request);

    // If no token, user is already logged out
    if (!token) {
      const cookie = clearSessionCookie();
      const response = NextResponse.json({ success: true });
      response.headers.set('Set-Cookie', cookie);
      return response;
    }

    // Try to verify the token to get session info
    const payload = await verifyToken(token);

    if (payload) {
      try {
        if (scope === 'all') {
          // Revoke ALL sessions for this user (cross-app logout)
          const revokedCount = await revokeAllUserSessions(
            payload.sub,
            'user_logout',
            'QUALITY_PROGRAM'
          );

          // Log cross-app logout
          await logAuthEvent({
            action: AUTH_ACTIONS.LOGOUT_ALL_SESSIONS,
            actorId: payload.sub,
            actorEmail: payload.email,
            actorRole: payload.role,
            ipAddress: ip,
            userAgent,
            metadata: {
              revokedCount,
              scope: 'all',
              companyId: payload.companyId,
            },
          });
        } else {
          // Revoke only current session
          await db.authSession.update({
            where: { id: payload.sessionId },
            data: {
              revokedAt: new Date(),
              revokedBy: payload.sub,
              revokedReason: 'user_logout',
            },
          });

          // Log single session logout
          await logAuthEvent({
            action: AUTH_ACTIONS.LOGOUT,
            actorId: payload.sub,
            actorEmail: payload.email,
            actorRole: payload.role,
            ipAddress: ip,
            userAgent,
            resourceType: 'AuthSession',
            resourceId: payload.sessionId,
            metadata: {
              scope: 'current',
              companyId: payload.companyId,
            },
          });
        }
      } catch (dbError) {
        // Log error but don't fail the logout
        console.error('[Logout] Failed to revoke session(s) in database:', dbError);

        // Still log the logout attempt
        await logAuthEvent({
          action: scope === 'all' ? AUTH_ACTIONS.LOGOUT_ALL_SESSIONS : AUTH_ACTIONS.LOGOUT,
          actorId: payload.sub,
          actorEmail: payload.email,
          actorRole: payload.role,
          ipAddress: ip,
          userAgent,
          resourceType: 'AuthSession',
          resourceId: payload.sessionId,
          metadata: {
            scope,
            companyId: payload.companyId,
            dbError: dbError instanceof Error ? dbError.message : 'Unknown error',
          },
        });
      }
    } else {
      // Token is invalid or expired - log session expired event
      await logAuthEvent({
        action: AUTH_ACTIONS.SESSION_EXPIRED,
        ipAddress: ip,
        userAgent,
        metadata: {
          reason: 'token_invalid_or_expired_at_logout',
        },
      });
    }

    // Always clear the cookie and return success
    const cookie = clearSessionCookie();
    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', cookie);
    return response;
  } catch (error) {
    // Log error but still clear cookie and return success
    // Logout should always "succeed" from user's perspective
    console.error('[Logout Error]', error);

    const cookie = clearSessionCookie();
    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', cookie);
    return response;
  }
}
