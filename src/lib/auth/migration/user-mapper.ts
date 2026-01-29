/**
 * User Mapper for Clerk to AuthUser Migration
 *
 * Handles the mapping of Clerk user data to AuthUser records,
 * including creating new records or updating existing ones.
 * Preserves clerkUserId for rollback capability.
 *
 * @module auth/migration/user-mapper
 */

import { db } from '@/lib/db';
import type { ClerkUserData } from './clerk-export';
import type { AuthMode, AuthUserType, AuthUserStatus } from '@prisma/client';

/**
 * Options for mapping Clerk users to AuthUser records.
 */
export interface MappingOptions {
  /** The auth mode to set for migrated users */
  setAuthMode: AuthMode;
  /** Whether to require password reset on first login */
  requirePasswordReset: boolean;
  /** Admin user ID who triggered the migration */
  migratedBy: string;
  /** Default user type if not determined from metadata */
  userType?: AuthUserType;
}

/**
 * Result of a single user mapping operation.
 */
export interface MappingResult {
  /** The AuthUser ID (empty if skipped) */
  authUserId: string;
  /** Whether a new record was created */
  created: boolean;
  /** Whether an existing record was updated */
  updated: boolean;
  /** Whether the mapping was skipped */
  skipped: boolean;
  /** Error message if skipped */
  error?: string;
}

/**
 * Map a Clerk user to AuthUser, creating or updating the record.
 * Preserves clerkUserId for rollback capability.
 *
 * @param clerkUser - The Clerk user data to map
 * @param options - Migration options
 * @returns Mapping result with authUserId and operation type
 *
 * @example
 * ```typescript
 * const result = await mapClerkUserToAuthUser(clerkUser, {
 *   setAuthMode: 'CLERK',
 *   requirePasswordReset: true,
 *   migratedBy: adminUserId,
 * });
 *
 * if (result.created) {
 *   console.log(`Created new user: ${result.authUserId}`);
 * }
 * ```
 */
export async function mapClerkUserToAuthUser(
  clerkUser: ClerkUserData,
  options: MappingOptions
): Promise<MappingResult> {
  if (!clerkUser.email) {
    return {
      authUserId: '',
      created: false,
      updated: false,
      skipped: true,
      error: `Clerk user ${clerkUser.id} has no email address`,
    };
  }

  try {
    // Check if user already exists (by clerkUserId or email)
    const existing = await db.authUser.findFirst({
      where: {
        OR: [{ clerkUserId: clerkUser.id }, { email: clerkUser.email }],
      },
    });

    if (existing) {
      // Update existing user with Clerk data
      await db.authUser.update({
        where: { id: existing.id },
        data: {
          clerkUserId: clerkUser.id,
          // Use JSON.parse/stringify for Prisma InputJsonValue compatibility
          clerkMetadata: JSON.parse(
            JSON.stringify({
              publicMetadata: clerkUser.publicMetadata,
              privateMetadata: clerkUser.privateMetadata,
              lastSignInAt: clerkUser.lastSignInAt,
              clerkCreatedAt: clerkUser.createdAt,
              emailVerified: clerkUser.emailVerified,
            })
          ),
          authMode: options.setAuthMode,
          migratedAt: options.setAuthMode === 'CUSTOM' ? new Date() : null,
          migratedBy: options.migratedBy,
        },
      });

      return {
        authUserId: existing.id,
        created: false,
        updated: true,
        skipped: false,
      };
    }

    // Determine user type from Clerk metadata or use default
    const userType = determineUserType(clerkUser, options.userType);

    // Determine initial status
    const status: AuthUserStatus = clerkUser.emailVerified
      ? 'ACTIVE'
      : 'PENDING_ACTIVATION';

    // Create new AuthUser
    const newUser = await db.authUser.create({
      data: {
        email: clerkUser.email,
        firstName: clerkUser.firstName || 'Unknown',
        lastName: clerkUser.lastName || 'User',
        phone: clerkUser.phone,
        userType,
        status,
        clerkUserId: clerkUser.id,
        // Use JSON.parse/stringify for Prisma InputJsonValue compatibility
        clerkMetadata: JSON.parse(
          JSON.stringify({
            publicMetadata: clerkUser.publicMetadata,
            privateMetadata: clerkUser.privateMetadata,
            lastSignInAt: clerkUser.lastSignInAt,
            clerkCreatedAt: clerkUser.createdAt,
            emailVerified: clerkUser.emailVerified,
          })
        ),
        authMode: options.setAuthMode,
        mustChangePassword: options.requirePasswordReset,
        migratedBy: options.migratedBy,
        migratedAt: options.setAuthMode === 'CUSTOM' ? new Date() : null,
      },
    });

    return {
      authUserId: newUser.id,
      created: true,
      updated: false,
      skipped: false,
    };
  } catch (error) {
    return {
      authUserId: '',
      created: false,
      updated: false,
      skipped: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Determine user type from Clerk metadata.
 *
 * @param clerkUser - The Clerk user data
 * @param defaultType - Default type if not determined
 * @returns The AuthUserType to assign
 */
function determineUserType(
  clerkUser: ClerkUserData,
  defaultType?: AuthUserType
): AuthUserType {
  // Check Clerk metadata for role hints
  const metadata = clerkUser.publicMetadata || {};

  // Look for common role indicators in metadata
  if (metadata.role === 'admin' || metadata.isAdmin) {
    return 'RANZ_ADMIN';
  }
  if (metadata.role === 'staff' || metadata.isStaff) {
    return 'RANZ_STAFF';
  }
  if (metadata.role === 'inspector') {
    return 'RANZ_INSPECTOR';
  }
  if (metadata.role === 'company_admin') {
    return 'MEMBER_COMPANY_ADMIN';
  }

  // Return provided default or fall back to MEMBER_COMPANY_USER
  return defaultType || 'MEMBER_COMPANY_USER';
}

/**
 * Result of a batch mapping operation.
 */
export interface BatchMappingResult {
  /** Individual mapping results */
  results: MappingResult[];
  /** Number of users created */
  created: number;
  /** Number of users updated */
  updated: number;
  /** Number of users skipped */
  skipped: number;
  /** Error messages from skipped users */
  errors: string[];
}

/**
 * Batch map multiple Clerk users to AuthUser records.
 *
 * @param clerkUsers - Array of Clerk user data
 * @param options - Migration options
 * @returns Batch result with counts and errors
 *
 * @example
 * ```typescript
 * const users = await exportClerkUsers();
 * const result = await batchMapClerkUsers(users, {
 *   setAuthMode: 'CLERK',
 *   requirePasswordReset: true,
 *   migratedBy: adminUserId,
 * });
 *
 * console.log(`Created: ${result.created}, Updated: ${result.updated}`);
 * if (result.errors.length > 0) {
 *   console.warn('Errors:', result.errors);
 * }
 * ```
 */
export async function batchMapClerkUsers(
  clerkUsers: ClerkUserData[],
  options: MappingOptions
): Promise<BatchMappingResult> {
  const results: MappingResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const clerkUser of clerkUsers) {
    const result = await mapClerkUserToAuthUser(clerkUser, options);
    results.push(result);

    if (result.created) created++;
    if (result.updated) updated++;
    if (result.skipped) {
      skipped++;
      if (result.error) {
        errors.push(`${clerkUser.email || clerkUser.id}: ${result.error}`);
      }
    }
  }

  return { results, created, updated, skipped, errors };
}
