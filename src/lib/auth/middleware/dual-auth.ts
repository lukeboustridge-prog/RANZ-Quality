/**
 * Dual-Auth Middleware
 *
 * Provides authentication that accepts both Clerk and custom auth tokens.
 * Used during migration period to allow gradual transition from Clerk to custom auth.
 *
 * Priority: Custom auth takes precedence over Clerk (we're migrating TO custom).
 *
 * Requirements:
 * - XAPP-01: Dual-read authentication during migration
 * - XAPP-02: Custom auth priority over Clerk
 */

import type { NextRequest } from 'next/server';
import { verifyToken } from '../jwt';
import { parseSessionCookie } from '../session';
import type { JWTPayload } from '../types';

// Clerk's session cookie name
const CLERK_COOKIE_NAME = '__session';

/**
 * Result of authentication check.
 */
export interface AuthResult {
  /** Whether the user is authenticated */
  authenticated: boolean;
  /** Which auth system authenticated the user */
  source: 'clerk' | 'custom' | null;
  /** Custom auth payload (when source is 'custom') */
  user?: JWTPayload;
  /** Clerk user ID (when source is 'clerk') */
  clerkUserId?: string;
}

/**
 * Check authentication using both Clerk and custom auth systems.
 *
 * Custom auth is checked first (takes priority) because we're migrating TO custom.
 * If custom auth fails or is not present, falls back to Clerk auth.
 *
 * @param request - Next.js request object
 * @returns Authentication result with source and user info
 */
export async function dualAuthCheck(request: NextRequest): Promise<AuthResult> {
  const cookieHeader = request.headers.get('cookie');

  // Try custom auth first (priority during migration)
  const customResult = await tryCustomAuth(cookieHeader);
  if (customResult.authenticated) {
    return customResult;
  }

  // Fall back to Clerk auth
  const clerkResult = await tryClerkAuth();
  if (clerkResult.authenticated) {
    return clerkResult;
  }

  // Neither auth system authenticated the user
  return {
    authenticated: false,
    source: null,
  };
}

/**
 * Attempt authentication using custom JWT system.
 */
async function tryCustomAuth(cookieHeader: string | null): Promise<AuthResult> {
  if (!cookieHeader) {
    return { authenticated: false, source: null };
  }

  const token = parseSessionCookie(cookieHeader);
  if (!token) {
    return { authenticated: false, source: null };
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      return { authenticated: false, source: null };
    }

    return {
      authenticated: true,
      source: 'custom',
      user: payload,
    };
  } catch {
    // Token verification failed
    return { authenticated: false, source: null };
  }
}

/**
 * Attempt authentication using Clerk.
 *
 * Uses dynamic import to avoid loading Clerk modules when not needed.
 * This prevents startup errors in environments without Clerk configuration.
 */
async function tryClerkAuth(): Promise<AuthResult> {
  try {
    // Dynamic import to avoid loading Clerk when not configured
    const { auth } = await import('@clerk/nextjs/server');
    const authResult = await auth();

    if (authResult.userId) {
      return {
        authenticated: true,
        source: 'clerk',
        clerkUserId: authResult.userId,
      };
    }

    return { authenticated: false, source: null };
  } catch {
    // Clerk not configured or import failed
    // This is expected in non-Clerk environments
    return { authenticated: false, source: null };
  }
}
