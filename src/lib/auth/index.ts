/**
 * Auth Module
 *
 * Unified authentication interface supporting multiple providers:
 * - clerk: Existing Clerk authentication
 * - custom: JWT-based manual credentials
 * - oidc: SwiftFox OIDC (future)
 *
 * Provider selection is controlled by AUTH_MODE environment variable.
 *
 * Usage:
 * ```typescript
 * import { getAuthProvider } from '@/lib/auth';
 *
 * const auth = getAuthProvider();
 * const user = await auth.getCurrentUser();
 * ```
 */

// Re-export types
export * from './types';

// Re-export utilities
export { signToken, verifyToken, generateRSAKeyPair, hashToken, decodeToken, isTokenExpired } from './jwt';
export { hashPassword, verifyPassword, validatePasswordComplexity, generateSecurePassword } from './password';
export {
  createSessionCookie,
  clearSessionCookie,
  parseSessionCookie,
  getSessionFromRequest,
  calculateSessionExpiry,
  isSessionExpired,
} from './session';
export {
  authRateLimiters,
  checkRateLimit,
  getRateLimitIdentifier,
  getIPFromRequest,
  getLockoutDuration,
  isAccountLocked,
  calculateLockoutExpiry,
  createRateLimitResponse,
  addRateLimitHeaders,
  type RateLimitResult,
} from './rate-limit';

// Re-export audit logging
export { logAuthEvent, AUTH_ACTIONS, type AuthAuditEvent, type AuthAction } from './audit';

// Re-export token utilities
export {
  generatePasswordResetToken,
  validatePasswordResetToken,
  consumePasswordResetToken,
  generateActivationToken,
  type TokenGenerationResult,
  type TokenValidationResult,
} from './tokens';

// Re-export email utilities
export {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  type WelcomeEmailParams,
  type PasswordResetEmailParams,
  type PasswordChangedEmailParams,
  type EmailSendResult,
} from './email';

// Re-export dual-auth middleware
export { dualAuthCheck, type AuthResult } from './middleware/dual-auth';

// Re-export cross-app utilities
export {
  revokeAllUserSessions,
  isSessionValid,
  getActiveSessionCount,
  type LogoutReason,
  type InitiatingApp,
} from './cross-app/logout-broadcast';

// Re-export internal API utilities
export {
  validateInternalApiKey,
  type InternalUserResponse,
  type InternalUsersResponse,
} from './internal-api';

// Import providers
import { clerkAuth } from './providers/clerk';
import { customAuth } from './providers/custom';
import { oidcAuth } from './providers/oidc';

// Export providers for direct access if needed
export { clerkAuth, customAuth, oidcAuth };

/**
 * Auth modes supported by the system.
 */
export type AuthMode = 'clerk' | 'custom' | 'oidc';

/**
 * Union type of all auth providers.
 * Each provider implements the same interface but may have additional methods.
 */
export type AuthProvider = typeof clerkAuth | typeof customAuth | typeof oidcAuth;

/**
 * Get the current auth mode from environment.
 * Defaults to 'clerk' to maintain backward compatibility.
 */
export function getAuthMode(): AuthMode {
  const mode = process.env.AUTH_MODE || 'clerk';

  if (!['clerk', 'custom', 'oidc'].includes(mode)) {
    console.warn(
      `Unknown AUTH_MODE "${mode}", defaulting to "clerk". ` +
      `Valid modes: clerk, custom, oidc`
    );
    return 'clerk';
  }

  return mode as AuthMode;
}

/**
 * Get the auth provider based on AUTH_MODE environment variable.
 *
 * @returns The configured auth provider
 * @throws Error if AUTH_MODE is 'oidc' (not yet implemented)
 *
 * @example
 * ```typescript
 * const auth = getAuthProvider();
 * const user = await auth.getCurrentUser();
 * if (user) {
 *   console.log(`Logged in as ${user.email}`);
 * }
 * ```
 */
export function getAuthProvider(): AuthProvider {
  const mode = getAuthMode();

  switch (mode) {
    case 'clerk':
      return clerkAuth;

    case 'custom':
      return customAuth;

    case 'oidc':
      // OIDC provider exists but is not fully implemented
      // Return it so callers get clear error messages
      return oidcAuth;

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = mode;
      throw new Error(`Unknown auth mode: ${_exhaustive}`);
  }
}

/**
 * Check if the current auth mode is the specified mode.
 * Useful for conditional logic based on auth provider.
 */
export function isAuthMode(mode: AuthMode): boolean {
  return getAuthMode() === mode;
}

/**
 * Get the current user using the configured provider.
 * Convenience function that doesn't require getting the provider first.
 */
export async function getCurrentUser(request?: Request) {
  const provider = getAuthProvider();
  return provider.getCurrentUser(request);
}

/**
 * Require authentication using the configured provider.
 * Throws if not authenticated.
 */
export async function requireAuth(request?: Request) {
  const provider = getAuthProvider();
  return provider.requireAuth(request);
}
