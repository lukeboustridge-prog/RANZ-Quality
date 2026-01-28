/**
 * Session Management Utilities
 *
 * Cookie-based session management for custom auth.
 * Sessions are stored in database and referenced via JWT in HttpOnly cookie.
 *
 * Requirements:
 * - AUTH-06: 8-hour session lifetime
 * - SECR-02: HttpOnly, Secure, SameSite cookies
 */

import { serialize, parse } from 'cookie';
import { DEFAULT_AUTH_CONFIG, type AuthConfig } from './types';

// Cookie options for session token
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Create a session cookie string.
 *
 * @param token - JWT access token
 * @param expiresAt - Cookie expiration date
 * @param config - Auth configuration
 * @returns Cookie header string
 */
export function createSessionCookie(
  token: string,
  expiresAt: Date,
  config: AuthConfig = DEFAULT_AUTH_CONFIG
): string {
  return serialize(config.sessionCookieName, token, {
    ...SESSION_COOKIE_OPTIONS,
    expires: expiresAt,
    domain: config.sessionCookieDomain,
  });
}

/**
 * Create a cookie string that clears the session.
 *
 * @param config - Auth configuration
 * @returns Cookie header string that expires immediately
 */
export function clearSessionCookie(
  config: AuthConfig = DEFAULT_AUTH_CONFIG
): string {
  return serialize(config.sessionCookieName, '', {
    ...SESSION_COOKIE_OPTIONS,
    expires: new Date(0),
    domain: config.sessionCookieDomain,
  });
}

/**
 * Parse session token from cookie header.
 *
 * @param cookieHeader - The Cookie header string
 * @param config - Auth configuration
 * @returns Session token or null if not found
 */
export function parseSessionCookie(
  cookieHeader: string | null,
  config: AuthConfig = DEFAULT_AUTH_CONFIG
): string | null {
  if (!cookieHeader) return null;

  const cookies = parse(cookieHeader);
  return cookies[config.sessionCookieName] || null;
}

/**
 * Extract session token from Next.js request.
 *
 * @param request - Next.js request object
 * @param config - Auth configuration
 * @returns Session token or null
 */
export function getSessionFromRequest(
  request: Request,
  config: AuthConfig = DEFAULT_AUTH_CONFIG
): string | null {
  const cookieHeader = request.headers.get('cookie');
  return parseSessionCookie(cookieHeader, config);
}

/**
 * Calculate session expiration date.
 * 8 hours from now per AUTH-06 requirement.
 *
 * @returns Date object for session expiration
 */
export function calculateSessionExpiry(): Date {
  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
  return new Date(Date.now() + EIGHT_HOURS_MS);
}

/**
 * Check if a session has expired.
 *
 * @param expiresAt - Session expiration date
 * @returns true if session is expired
 */
export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() >= expiresAt;
}
