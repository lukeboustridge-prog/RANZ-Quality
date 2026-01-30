/**
 * Clerk Auth Provider
 *
 * Wraps existing @clerk/nextjs functionality to implement AuthProvider interface.
 * This is the current production auth system that will continue working during
 * transition to custom auth.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import type { AuthenticatedUser, SessionInfo, TokenPair, AuthUserRole } from '../types';

// Map Clerk role claims to our AuthUserRole type
function mapClerkRole(clerkRole?: string): AuthUserRole {
  const roleMap: Record<string, AuthUserRole> = {
    'org:owner': 'MEMBER_COMPANY_ADMIN',
    'org:admin': 'MEMBER_COMPANY_ADMIN',
    'org:member': 'MEMBER_COMPANY_USER',
    'ranz:admin': 'RANZ_ADMIN',
    'ranz:staff': 'RANZ_STAFF',
    'ranz:auditor': 'RANZ_INSPECTOR',
    'ranz:inspector': 'RANZ_INSPECTOR',
  };

  return roleMap[clerkRole || ''] || 'MEMBER_COMPANY_USER';
}

/**
 * Clerk Auth Provider Implementation
 */
export const clerkAuth = {
  /**
   * Get the current authenticated user.
   * Uses Clerk's currentUser() which reads from the session.
   */
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    try {
      const user = await currentUser();
      if (!user) return null;

      // Get organization membership for role
      const { orgId, orgRole } = await auth();

      // Check publicMetadata for RANZ admin role (takes priority over org role)
      const publicMetadataRole = (user.publicMetadata as { role?: string })?.role;
      const effectiveRole = publicMetadataRole || orgRole || undefined;

      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        userType: mapClerkRole(effectiveRole),
        companyId: orgId || undefined,
        status: 'ACTIVE',
        mustChangePassword: false, // Clerk handles password management
      };
    } catch (error) {
      console.error('Clerk getCurrentUser error:', error);
      return null;
    }
  },

  /**
   * Require authentication - throws if not authenticated.
   */
  async requireAuth(): Promise<AuthenticatedUser> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  },

  /**
   * Check if user has a specific permission.
   * Uses Clerk organization roles.
   */
  async hasPermission(permission: string): Promise<boolean> {
    const authResult = await auth();
    // Clerk uses has() for permission checking
    if (!authResult.has) return false;
    try {
      return authResult.has({ permission });
    } catch {
      return false;
    }
  },

  /**
   * Validate a session token.
   * For Clerk, this is handled automatically by middleware.
   */
  async validateSession(_token: string): Promise<AuthenticatedUser | null> {
    // Clerk validates sessions via middleware, not direct token validation
    // This method exists for interface compatibility
    return this.getCurrentUser();
  },

  /**
   * Create a new session.
   * Not applicable for Clerk - sessions created via Clerk's sign-in flow.
   */
  async createSession(_userId: string): Promise<TokenPair> {
    throw new Error(
      'createSession not supported in Clerk mode. Use Clerk sign-in flow.'
    );
  },

  /**
   * Revoke a session.
   * Uses Clerk's session management.
   */
  async revokeSession(_sessionId: string): Promise<void> {
    // Clerk session revocation would be done via Clerk API
    // For now, this is a no-op as Clerk handles session management
    console.warn('Session revocation in Clerk mode - use Clerk dashboard');
  },

  /**
   * Get session info.
   * Returns basic info from Clerk session.
   */
  async getSession(): Promise<SessionInfo | null> {
    const { sessionId, userId, orgId } = await auth();
    if (!sessionId || !userId) return null;

    return {
      id: sessionId,
      userId,
      application: 'QUALITY_PROGRAM',
      createdAt: new Date(), // Clerk doesn't expose creation time easily
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      isRevoked: false,
    };
  },

  /**
   * Provider identifier
   */
  name: 'clerk' as const,
};

export type ClerkAuthProvider = typeof clerkAuth;
