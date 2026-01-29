/**
 * Cross-App Logout Broadcast
 *
 * Handles session revocation across all applications.
 * When a user logs out from Quality Program or Roofing Report,
 * all their sessions are invalidated.
 *
 * Requirements:
 * - XAPP-05: Logging out from one app logs user out from all apps
 */

import { db } from '@/lib/db';

export type LogoutReason =
  | 'user_logout'
  | 'admin_revoke'
  | 'password_change'
  | 'security_concern'
  | 'account_deactivated'
  | 'account_suspended';

export type InitiatingApp = 'QUALITY_PROGRAM' | 'ROOFING_REPORT' | 'MOBILE';

/**
 * Revoke all sessions for a user across all applications.
 * Called when user logs out with scope='all' or when security action requires it.
 *
 * @param userId - The user's ID
 * @param reason - Reason for logout
 * @param initiatingApp - Which app initiated the logout
 * @returns Number of sessions revoked
 */
export async function revokeAllUserSessions(
  userId: string,
  reason: LogoutReason,
  initiatingApp: InitiatingApp
): Promise<number> {
  const result = await db.authSession.updateMany({
    where: {
      userId,
      revokedAt: null, // Only active sessions
    },
    data: {
      revokedAt: new Date(),
      revokedBy: userId,
      revokedReason: `${reason}:${initiatingApp}`,
    },
  });

  return result.count;
}

/**
 * Check if a session is still valid (not revoked and not expired).
 * Use sparingly - adds database call. Best for critical operations.
 *
 * @param sessionId - The session ID from JWT payload
 * @returns true if session is valid and not revoked
 */
export async function isSessionValid(sessionId: string): Promise<boolean> {
  const session = await db.authSession.findUnique({
    where: { id: sessionId },
    select: {
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!session) return false;
  if (session.revokedAt) return false;
  if (new Date() >= session.expiresAt) return false;

  return true;
}

/**
 * Get count of active sessions for a user.
 * Useful for admin dashboard or security monitoring.
 *
 * @param userId - The user's ID
 * @returns Count of active (non-revoked, non-expired) sessions
 */
export async function getActiveSessionCount(userId: string): Promise<number> {
  return db.authSession.count({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}
