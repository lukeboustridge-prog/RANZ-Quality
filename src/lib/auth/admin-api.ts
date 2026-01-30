/**
 * Admin API Authentication Helper
 *
 * Provides authentication for admin API routes that works with both
 * Clerk and custom auth modes based on AUTH_MODE environment variable.
 */

import { getAuthMode, getCurrentUser } from './index';
import { getSessionFromRequest, verifyToken } from './index';
import type { AuthenticatedUser } from './types';

const ADMIN_ROLES = ['RANZ_ADMIN', 'RANZ_STAFF', 'RANZ_INSPECTOR'];

interface AdminAuthResult {
  success: true;
  user: AuthenticatedUser;
}

interface AdminAuthError {
  success: false;
  error: string;
  status: number;
}

export type AdminAuthResponse = AdminAuthResult | AdminAuthError;

/**
 * Authenticate an admin API request.
 * Works with both Clerk and custom auth modes.
 *
 * @param request - The incoming request
 * @param allowedRoles - Roles that can access this endpoint (defaults to RANZ_ADMIN, RANZ_STAFF)
 * @returns Authentication result with user or error
 */
export async function authenticateAdminRequest(
  request: Request,
  allowedRoles: string[] = ['RANZ_ADMIN', 'RANZ_STAFF']
): Promise<AdminAuthResponse> {
  const authMode = getAuthMode();

  try {
    if (authMode === 'clerk') {
      // Use Clerk auth via unified getCurrentUser
      const user = await getCurrentUser();

      if (!user) {
        return { success: false, error: 'Not authenticated', status: 401 };
      }

      // Check if user has an allowed role
      if (!allowedRoles.includes(user.userType)) {
        return { success: false, error: 'Insufficient permissions', status: 403 };
      }

      return { success: true, user };
    } else {
      // Use custom auth via session token
      const sessionToken = getSessionFromRequest(request);
      if (!sessionToken) {
        return { success: false, error: 'Not authenticated', status: 401 };
      }

      const payload = await verifyToken(sessionToken);
      if (!payload) {
        return { success: false, error: 'Invalid session', status: 401 };
      }

      // Check if user has an allowed role
      if (!allowedRoles.includes(payload.role as string)) {
        return { success: false, error: 'Insufficient permissions', status: 403 };
      }

      // Return user info from token payload
      return {
        success: true,
        user: {
          id: payload.sub,
          email: payload.email,
          firstName: payload.name?.split(' ')[0] || '',
          lastName: payload.name?.split(' ').slice(1).join(' ') || '',
          userType: payload.role as any,
          companyId: payload.companyId,
          status: 'ACTIVE',
          mustChangePassword: false,
        },
      };
    }
  } catch (error) {
    console.error('[Admin Auth] Error:', error);
    return { success: false, error: 'Authentication error', status: 500 };
  }
}

/**
 * Helper to return an error response from admin auth
 */
export function adminAuthErrorResponse(result: AdminAuthError): Response {
  return Response.json({ error: result.error }, { status: result.status });
}
