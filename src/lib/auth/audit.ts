/**
 * Auth Audit Logging Utility
 *
 * Provides event logging to AuthAuditLog table for all authentication-related
 * actions. Uses fire-and-forget pattern - audit failures should not break
 * auth flows.
 *
 * Usage:
 * ```typescript
 * import { logAuthEvent, AUTH_ACTIONS } from '@/lib/auth/audit';
 *
 * await logAuthEvent({
 *   action: AUTH_ACTIONS.LOGIN_SUCCESS,
 *   actorId: user.id,
 *   actorEmail: user.email,
 *   ipAddress: getIPFromRequest(request),
 * });
 * ```
 */

import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

/** JSON value type compatible with Prisma */
type JsonValue = Prisma.InputJsonValue;

/**
 * Auth audit event data structure.
 * Maps to AuthAuditLog Prisma model fields.
 */
export interface AuthAuditEvent {
  /** The action being logged (use AUTH_ACTIONS constants) */
  action: string;
  /** ID of the user performing the action (null for anonymous/system) */
  actorId?: string;
  /** Email of the user performing the action */
  actorEmail?: string;
  /** Role of the actor (e.g., 'MEMBER_COMPANY_ADMIN', 'RANZ_ADMIN') */
  actorRole?: string;
  /** IP address of the request */
  ipAddress?: string;
  /** User agent string from the request */
  userAgent?: string;
  /** Type of resource being acted upon (default: 'AuthUser') */
  resourceType?: string;
  /** ID of the resource being acted upon */
  resourceId?: string;
  /** Previous state before the action (for update events) */
  previousState?: JsonValue;
  /** New state after the action (for create/update events) */
  newState?: JsonValue;
  /** Additional metadata about the event */
  metadata?: JsonValue;
}

/**
 * Standard authentication action types.
 * Use these constants for consistency across the codebase.
 */
export const AUTH_ACTIONS = {
  // Login actions
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_RATE_LIMITED: 'LOGIN_RATE_LIMITED',
  LOGIN_ERROR: 'LOGIN_ERROR',

  // Logout actions
  LOGOUT: 'LOGOUT',
  LOGOUT_ALL_SESSIONS: 'LOGOUT_ALL_SESSIONS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',

  // Password actions
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  PASSWORD_RESET_FAILED: 'PASSWORD_RESET_FAILED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  FIRST_LOGIN_PASSWORD_CHANGE: 'FIRST_LOGIN_PASSWORD_CHANGE',

  // Account actions
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
  WELCOME_EMAIL_SENT: 'WELCOME_EMAIL_SENT',
  WELCOME_EMAIL_RESENT: 'WELCOME_EMAIL_RESENT',
  ACCOUNT_ACTIVATED: 'ACCOUNT_ACTIVATED',
  ACCOUNT_ACTIVATION_EXPIRED: 'ACCOUNT_ACTIVATION_EXPIRED',

  // User management actions (admin operations)
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_COMPANY_CHANGED: 'USER_COMPANY_CHANGED',
  USER_BATCH_UPDATED: 'USER_BATCH_UPDATED',
  PASSWORD_ADMIN_RESET: 'PASSWORD_ADMIN_RESET',
} as const;

/** Type for AUTH_ACTIONS values */
export type AuthAction = (typeof AUTH_ACTIONS)[keyof typeof AUTH_ACTIONS];

/**
 * Log an authentication event to the AuthAuditLog table.
 *
 * This function uses fire-and-forget semantics:
 * - Audit failures are logged to console.error but do not throw
 * - Auth flows should not be blocked by audit logging issues
 *
 * @param event - The audit event data to log
 *
 * @example
 * ```typescript
 * // Log a successful login
 * await logAuthEvent({
 *   action: AUTH_ACTIONS.LOGIN_SUCCESS,
 *   actorId: user.id,
 *   actorEmail: user.email,
 *   actorRole: user.userType,
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...',
 *   resourceType: 'AuthUser',
 *   resourceId: user.id,
 *   metadata: { sessionId: session.id },
 * });
 *
 * // Log a failed login attempt
 * await logAuthEvent({
 *   action: AUTH_ACTIONS.LOGIN_FAILED,
 *   actorEmail: attemptedEmail,
 *   ipAddress: '192.168.1.1',
 *   metadata: { reason: 'Invalid password', attemptCount: 3 },
 * });
 * ```
 */
export async function logAuthEvent(event: AuthAuditEvent): Promise<void> {
  try {
    await db.authAuditLog.create({
      data: {
        action: event.action,
        actorId: event.actorId ?? null,
        actorEmail: event.actorEmail ?? null,
        actorRole: event.actorRole ?? null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        resourceType: event.resourceType ?? 'AuthUser',
        resourceId: event.resourceId ?? null,
        previousState: event.previousState ?? undefined,
        newState: event.newState ?? undefined,
        metadata: event.metadata ?? undefined,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit failures shouldn't break auth flows
    console.error('[Auth Audit] Failed to log event:', {
      action: event.action,
      actorId: event.actorId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
