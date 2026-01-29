/**
 * Clerk Export Utilities
 *
 * Provides functions to export user data from Clerk for migration
 * to the custom authentication system.
 *
 * These utilities are used by the admin migration API endpoints
 * to retrieve Clerk user data with proper pagination handling.
 *
 * @module auth/migration/clerk-export
 */

import { clerkClient } from '@clerk/nextjs/server';

/**
 * Sanitized Clerk user data for migration.
 * Contains only the fields needed for AuthUser creation.
 */
export interface ClerkUserData {
  /** Clerk user ID (user_xxx format) */
  id: string;
  /** Primary email address */
  email: string;
  /** First name */
  firstName: string | null;
  /** Last name */
  lastName: string | null;
  /** Primary phone number */
  phone: string | null;
  /** Public metadata stored in Clerk */
  publicMetadata: Record<string, unknown>;
  /** Private metadata stored in Clerk */
  privateMetadata: Record<string, unknown>;
  /** Account creation timestamp (milliseconds) */
  createdAt: number;
  /** Last sign-in timestamp (milliseconds) */
  lastSignInAt: number | null;
  /** Whether the email is verified */
  emailVerified: boolean;
}

/**
 * Export all users from Clerk with pagination.
 * Returns sanitized user data for migration mapping.
 *
 * @returns Array of all Clerk users
 *
 * @example
 * ```typescript
 * const users = await exportClerkUsers();
 * console.log(`Found ${users.length} users in Clerk`);
 * ```
 */
export async function exportClerkUsers(): Promise<ClerkUserData[]> {
  const client = await clerkClient();
  const allUsers: ClerkUserData[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await client.users.getUserList({
      limit,
      offset,
    });

    const users = response.data;
    const totalCount = response.totalCount;

    allUsers.push(
      ...users.map((u) => ({
        id: u.id,
        email: u.emailAddresses[0]?.emailAddress || '',
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phoneNumbers[0]?.phoneNumber || null,
        publicMetadata: u.publicMetadata as Record<string, unknown>,
        privateMetadata: u.privateMetadata as Record<string, unknown>,
        createdAt: u.createdAt,
        lastSignInAt: u.lastSignInAt,
        emailVerified: u.emailAddresses[0]?.verification?.status === 'verified',
      }))
    );

    if (allUsers.length >= totalCount) break;
    offset += limit;
  }

  return allUsers;
}

/**
 * Export a single user from Clerk by ID.
 *
 * @param clerkUserId - The Clerk user ID (user_xxx format)
 * @returns User data or null if not found
 *
 * @example
 * ```typescript
 * const user = await exportClerkUser('user_abc123');
 * if (user) {
 *   console.log(`Found user: ${user.email}`);
 * }
 * ```
 */
export async function exportClerkUser(
  clerkUserId: string
): Promise<ClerkUserData | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);

    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phoneNumbers[0]?.phoneNumber || null,
      publicMetadata: user.publicMetadata as Record<string, unknown>,
      privateMetadata: user.privateMetadata as Record<string, unknown>,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      emailVerified: user.emailAddresses[0]?.verification?.status === 'verified',
    };
  } catch (error) {
    console.error(`Failed to export Clerk user ${clerkUserId}:`, error);
    return null;
  }
}

/**
 * Get count of users in Clerk.
 * Useful for migration progress tracking.
 *
 * @returns Total number of users in Clerk
 *
 * @example
 * ```typescript
 * const count = await getClerkUserCount();
 * console.log(`Total Clerk users: ${count}`);
 * ```
 */
export async function getClerkUserCount(): Promise<number> {
  const client = await clerkClient();
  const response = await client.users.getUserList({ limit: 1 });
  return response.totalCount;
}
