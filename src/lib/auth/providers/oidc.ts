/**
 * OIDC Auth Provider (Stub)
 *
 * Placeholder for SwiftFox OIDC integration.
 * This provider will be implemented when SwiftFox OIDC specification is available.
 *
 * Current implementation throws errors to prevent accidental use before
 * the OIDC integration is complete.
 */

import type { AuthenticatedUser, SessionInfo, TokenPair, AuthUserRole } from '../types';

// SwiftFox OIDC configuration (to be filled when spec is available)
interface OIDCConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  claimMapping: {
    sub: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
  };
}

// Placeholder config - will be populated from environment
const OIDC_CONFIG: OIDCConfig = {
  issuer: process.env.OIDC_ISSUER || '',
  clientId: process.env.OIDC_CLIENT_ID || '',
  clientSecret: process.env.OIDC_CLIENT_SECRET || '',
  redirectUri: process.env.OIDC_REDIRECT_URI || '',
  scopes: ['openid', 'profile', 'email'],
  claimMapping: {
    sub: 'sub',
    email: 'email',
    name: 'name',
    role: 'role',
    companyId: 'company_id',
  },
};

/**
 * Map OIDC role claims to our AuthUserRole type.
 * This mapping will be customized when SwiftFox spec is available.
 */
function mapOIDCRole(oidcRole?: string): AuthUserRole {
  const roleMap: Record<string, AuthUserRole> = {
    admin: 'RANZ_ADMIN',
    staff: 'RANZ_STAFF',
    inspector: 'RANZ_INSPECTOR',
    company_admin: 'MEMBER_COMPANY_ADMIN',
    company_user: 'MEMBER_COMPANY_USER',
    external: 'EXTERNAL_INSPECTOR',
  };

  return roleMap[oidcRole || ''] || 'MEMBER_COMPANY_USER';
}

/**
 * OIDC Auth Provider Implementation (Stub)
 */
export const oidcAuth = {
  /**
   * Get the current authenticated user from OIDC session.
   * Not yet implemented - awaiting SwiftFox OIDC spec.
   */
  async getCurrentUser(_request?: Request): Promise<AuthenticatedUser | null> {
    throw new Error(
      'OIDC provider not yet implemented. ' +
      'SwiftFox OIDC specification required. ' +
      'Use AUTH_MODE=clerk or AUTH_MODE=custom.'
    );
  },

  /**
   * Require authentication.
   */
  async requireAuth(_request?: Request): Promise<AuthenticatedUser> {
    throw new Error(
      'OIDC provider not yet implemented. ' +
      'SwiftFox OIDC specification required.'
    );
  },

  /**
   * Check permission.
   */
  async hasPermission(
    _permission: string,
    _request?: Request
  ): Promise<boolean> {
    throw new Error('OIDC provider not yet implemented.');
  },

  /**
   * Validate OIDC session token.
   */
  async validateSession(_token: string): Promise<AuthenticatedUser | null> {
    throw new Error('OIDC provider not yet implemented.');
  },

  /**
   * Create session.
   * For OIDC, sessions are created via the authorization flow.
   */
  async createSession(_userId: string): Promise<TokenPair> {
    throw new Error(
      'OIDC sessions are created via authorization flow, not createSession.'
    );
  },

  /**
   * Revoke OIDC session.
   */
  async revokeSession(_sessionId: string): Promise<void> {
    throw new Error('OIDC provider not yet implemented.');
  },

  /**
   * Get session info.
   */
  async getSession(_token?: string): Promise<SessionInfo | null> {
    throw new Error('OIDC provider not yet implemented.');
  },

  /**
   * Get OIDC authorization URL.
   * Redirects user to SwiftFox for authentication.
   */
  getAuthorizationUrl(state: string): string {
    if (!OIDC_CONFIG.issuer || !OIDC_CONFIG.clientId) {
      throw new Error(
        'OIDC not configured. Set OIDC_ISSUER and OIDC_CLIENT_ID environment variables.'
      );
    }

    const params = new URLSearchParams({
      client_id: OIDC_CONFIG.clientId,
      redirect_uri: OIDC_CONFIG.redirectUri,
      response_type: 'code',
      scope: OIDC_CONFIG.scopes.join(' '),
      state,
    });

    return `${OIDC_CONFIG.issuer}/authorize?${params.toString()}`;
  },

  /**
   * Exchange authorization code for tokens.
   * Called after user returns from SwiftFox.
   */
  async exchangeCode(_code: string): Promise<{
    accessToken: string;
    idToken: string;
    refreshToken?: string;
  }> {
    throw new Error(
      'OIDC provider not yet implemented. ' +
      'Code exchange requires SwiftFox OIDC spec.'
    );
  },

  /**
   * Provider identifier
   */
  name: 'oidc' as const,

  /**
   * Provider readiness status
   */
  isReady: false,
};

export type OIDCAuthProvider = typeof oidcAuth;
