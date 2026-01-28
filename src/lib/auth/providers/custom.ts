/**
 * Custom JWT Auth Provider
 *
 * JWT-based authentication using RSA signing.
 * This is the provider used when AUTH_MODE=custom.
 * Implements manual credentials flow with database-backed sessions.
 *
 * Note: This provider requires Prisma client and database connection.
 * Full implementation of login/register endpoints is in Phase 2.
 */

import { verifyToken, hashToken } from '../jwt';
import {
  getSessionFromRequest,
  calculateSessionExpiry,
} from '../session';
import type {
  AuthenticatedUser,
  SessionInfo,
  TokenPair,
  JWTPayload,
} from '../types';

/**
 * Custom Auth Provider Implementation
 *
 * This provider handles JWT-based authentication with database sessions.
 * Session creation and user lookup require Prisma client, which will be
 * wired up in Phase 2 when API routes are created.
 */
export const customAuth = {
  /**
   * Get the current authenticated user from request context.
   * This version works with a token passed directly.
   */
  async getCurrentUserFromToken(
    token: string
  ): Promise<AuthenticatedUser | null> {
    const payload = await verifyToken(token);
    if (!payload) return null;

    // Verify session hasn't been revoked (requires database lookup)
    // This will be implemented fully in Phase 2 with Prisma integration
    const isSessionValid = await this.isSessionValid(payload.sessionId);
    if (!isSessionValid) return null;

    return {
      id: payload.sub,
      email: payload.email,
      firstName: payload.name.split(' ')[0] || '',
      lastName: payload.name.split(' ').slice(1).join(' ') || '',
      userType: payload.role,
      companyId: payload.companyId,
      status: 'ACTIVE', // If session is valid, user is active
      mustChangePassword: false, // Would be checked from database
    };
  },

  /**
   * Get the current authenticated user.
   * Requires request context to extract token from cookie.
   *
   * @param request - The incoming request (optional, for cookie extraction)
   */
  async getCurrentUser(request?: Request): Promise<AuthenticatedUser | null> {
    if (!request) {
      // Without request, can't get token from cookie
      // This will be enhanced in Phase 2 with Next.js context
      return null;
    }

    const token = getSessionFromRequest(request);
    if (!token) return null;

    return this.getCurrentUserFromToken(token);
  },

  /**
   * Require authentication - throws if not authenticated.
   */
  async requireAuth(request?: Request): Promise<AuthenticatedUser> {
    const user = await this.getCurrentUser(request);
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  },

  /**
   * Check if user has a specific permission.
   * Permission checking will be fully implemented in Phase 2.
   */
  async hasPermission(
    _permission: string,
    _request?: Request
  ): Promise<boolean> {
    // TODO: Implement permission lookup from AuthUserPermission table
    // This requires Prisma client, fully implemented in Phase 2
    return false;
  },

  /**
   * Validate a session token and return the user if valid.
   */
  async validateSession(token: string): Promise<AuthenticatedUser | null> {
    return this.getCurrentUserFromToken(token);
  },

  /**
   * Create a new session for a user.
   * Requires database access - stub for Phase 1, full implementation in Phase 2.
   *
   * @param userId - The user ID to create session for
   * @param metadata - Additional session metadata
   */
  async createSession(
    _userId: string,
    _metadata?: {
      ipAddress?: string;
      userAgent?: string;
      application?: 'QUALITY_PROGRAM' | 'ROOFING_REPORT' | 'MOBILE';
    }
  ): Promise<TokenPair> {
    // This is a stub - full implementation requires:
    // 1. Lookup user from database
    // 2. Create AuthSession record
    // 3. Sign JWT with user claims and session ID
    // 4. Return token pair

    // Implemented in Phase 2: src/app/api/auth/login/route.ts
    throw new Error(
      'createSession requires database access. Implemented in Phase 2 API routes.'
    );
  },

  /**
   * Revoke a session by ID.
   * Marks session as revoked in database.
   */
  async revokeSession(_sessionId: string): Promise<void> {
    // This is a stub - full implementation requires Prisma client
    // Updates AuthSession.revokedAt, revokedBy, revokedReason
    throw new Error(
      'revokeSession requires database access. Implemented in Phase 2 API routes.'
    );
  },

  /**
   * Check if a session is still valid (not revoked, not expired).
   * Stub for Phase 1 - returns true to allow token validation to proceed.
   */
  async isSessionValid(_sessionId: string): Promise<boolean> {
    // This is a stub - full implementation queries AuthSession table
    // Checks: exists, not revoked, not expired
    // For Phase 1, we trust the JWT expiration
    return true;
  },

  /**
   * Get session info from token.
   */
  async getSession(token: string): Promise<SessionInfo | null> {
    const payload = await verifyToken(token);
    if (!payload) return null;

    return {
      id: payload.sessionId,
      userId: payload.sub,
      application: 'QUALITY_PROGRAM', // Would come from JWT or database
      createdAt: new Date((payload.iat || 0) * 1000),
      expiresAt: new Date((payload.exp || 0) * 1000),
      isRevoked: false, // Would be checked from database
    };
  },

  /**
   * Get token hash for session lookup.
   * Used to find sessions by token without storing the token itself.
   */
  async getTokenHash(token: string): Promise<string> {
    return hashToken(token);
  },

  /**
   * Provider identifier
   */
  name: 'custom' as const,
};

export type CustomAuthProvider = typeof customAuth;
