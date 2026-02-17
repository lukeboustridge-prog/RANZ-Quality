/**
 * Auth Types
 *
 * Core type definitions for the authentication system.
 * These types are used across JWT, password, session, and provider modules.
 */

// JWT Payload structure - minimal claims for performance
export interface JWTPayload {
  // Standard JWT claims
  sub: string;          // User ID (AuthUser.id)
  iat?: number;         // Issued at (Unix timestamp)
  exp?: number;         // Expiration (Unix timestamp)
  jti?: string;         // JWT ID (unique token identifier)
  iss?: string;         // Issuer (https://portal.ranz.co.nz)
  aud?: string[];       // Audience (allowed domains)

  // Custom claims
  email: string;
  name: string;         // firstName + lastName
  role: AuthUserRole;   // User type for RBAC
  companyId?: string;   // For member users
  sessionId: string;    // Links to AuthSession table for revocation
  type: 'access' | 'refresh';
}

// User roles from Prisma enum (duplicated for runtime use without Prisma import)
export type AuthUserRole =
  | 'MEMBER_COMPANY_ADMIN'
  | 'MEMBER_COMPANY_USER'
  | 'RANZ_ADMIN'
  | 'RANZ_STAFF'
  | 'RANZ_INSPECTOR'
  | 'EXTERNAL_INSPECTOR';

// User status
export type AuthUserStatusType =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DEACTIVATED';

// Application types
export type AuthAppType = 'QUALITY_PROGRAM' | 'ROOFING_REPORT' | 'MOBILE';

// Simplified user type for auth operations (not full Prisma model)
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: AuthUserRole;
  companyId?: string;
  status: AuthUserStatusType;
  mustChangePassword: boolean;
}

// Session info
export interface SessionInfo {
  id: string;
  userId: string;
  application: AuthAppType;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isRevoked: boolean;
}

// Password complexity validation result
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

// Token pair for auth responses
export interface TokenPair {
  accessToken: string;
  expiresAt: Date;
  sessionId: string;
}

// Auth configuration
export interface AuthConfig {
  jwtIssuer: string;
  jwtAudience: string[];
  accessTokenLifetime: string;  // e.g., '8h'
  bcryptRounds: number;
  sessionCookieName: string;
  sessionCookieDomain: string;
}

// Default configuration
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  jwtIssuer: 'https://portal.ranz.co.nz',
  jwtAudience: ['portal.ranz.co.nz', 'reports.ranz.co.nz'],
  accessTokenLifetime: '8h',
  bcryptRounds: 12,
  sessionCookieName: 'ranz_session',
  sessionCookieDomain: '.ranz.co.nz',
};
