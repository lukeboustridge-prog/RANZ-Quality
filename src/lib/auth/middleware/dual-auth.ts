/**
 * Dual-Auth Middleware
 *
 * Provides authentication that accepts both Clerk and custom auth tokens.
 * Used during migration period to allow gradual transition from Clerk to custom auth.
 *
 * Priority: Custom auth takes precedence over Clerk (we're migrating TO custom).
 * Per-user authMode is checked from database to support gradual rollout.
 *
 * Requirements:
 * - XAPP-01: Dual-read authentication during migration
 * - XAPP-02: Custom auth priority over Clerk
 * - XAPP-03: Per-user auth mode checking for gradual rollout
 */

import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '../jwt';
import { parseSessionCookie } from '../session';
import type { JWTPayload } from '../types';
import type { AuthMode } from '@prisma/client';

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
  /** User's auth mode from database (for per-user migration control) */
  authMode?: AuthMode;
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
 * Looks up user's authMode from database for per-user migration control.
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

    // Look up user's individual auth mode from database
    const user = await db.authUser.findUnique({
      where: { id: payload.sub },
      select: { authMode: true },
    });

    // If user's authMode is CUSTOM or MIGRATING, accept the custom token
    // CLERK mode users should fall through to Clerk auth
    if (user && (user.authMode === 'CUSTOM' || user.authMode === 'MIGRATING')) {
      return {
        authenticated: true,
        source: 'custom',
        user: payload,
        authMode: user.authMode,
      };
    }

    // User is CLERK mode but has valid custom token - this is transitional
    // Return auth result but include authMode for downstream handling
    if (user) {
      return {
        authenticated: true,
        source: 'custom',
        user: payload,
        authMode: user.authMode,
      };
    }

    // User not found in database - token valid but user deleted?
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
 * Looks up user's authMode from database for per-user migration control.
 */
async function tryClerkAuth(): Promise<AuthResult> {
  try {
    // Dynamic import to avoid loading Clerk when not configured
    const { auth } = await import('@clerk/nextjs/server');
    const authResult = await auth();

    if (authResult.userId) {
      // Look up user's auth mode by clerkUserId
      const user = await db.authUser.findUnique({
        where: { clerkUserId: authResult.userId },
        select: { authMode: true },
      });

      return {
        authenticated: true,
        source: 'clerk',
        clerkUserId: authResult.userId,
        authMode: user?.authMode || 'CLERK',
      };
    }

    return { authenticated: false, source: null };
  } catch {
    // Clerk not configured or import failed
    // This is expected in non-Clerk environments
    return { authenticated: false, source: null };
  }
}
