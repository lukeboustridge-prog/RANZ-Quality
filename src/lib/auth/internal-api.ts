/**
 * Internal API Authentication
 *
 * Server-to-server authentication for satellite apps (Roofing Report)
 * to access Quality Program data via internal API endpoints.
 *
 * Authentication uses a shared API key passed in X-Internal-API-Key header.
 */

import { NextRequest } from 'next/server';

/**
 * Validate internal API key for server-to-server communication.
 * Used by satellite apps (Roofing Report) to access Quality Program data.
 *
 * @param request - The incoming request
 * @returns true if valid API key, false otherwise
 */
export function validateInternalApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-Internal-API-Key');
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    console.error('[Internal API] INTERNAL_API_KEY not configured');
    return false;
  }

  if (!apiKey) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (apiKey.length !== expectedKey.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < apiKey.length; i++) {
    result |= apiKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Internal API response types for satellite apps.
 */
export interface InternalUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  status: string;
  companyId: string | null;
  company: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface InternalUsersResponse {
  users: InternalUserResponse[];
  total: number;
}
