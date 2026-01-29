export const runtime = 'nodejs';

/**
 * Migration Export API
 *
 * GET /api/admin/migration/export
 *
 * Exports all users from Clerk with sanitized data for review.
 * This is a read-only operation that does not modify any records.
 *
 * Required role: RANZ_ADMIN only
 */

import { NextRequest } from 'next/server';
import { getSessionFromRequest, verifyToken } from '@/lib/auth';
import { exportClerkUsers } from '@/lib/auth/migration/clerk-export';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    const sessionToken = getSessionFromRequest(request);
    if (!sessionToken) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(sessionToken);
    if (!payload) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check admin role (RANZ_ADMIN only for migration operations)
    if (payload.role !== 'RANZ_ADMIN') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Export all users from Clerk
    const users = await exportClerkUsers();

    return Response.json({
      count: users.length,
      users: users.map((u) => ({
        clerkId: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        emailVerified: u.emailVerified,
        createdAt: new Date(u.createdAt).toISOString(),
        lastSignInAt: u.lastSignInAt
          ? new Date(u.lastSignInAt).toISOString()
          : null,
        hasPublicMetadata: Object.keys(u.publicMetadata).length > 0,
      })),
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to export Clerk users:', error);
    return Response.json(
      { error: 'Failed to export Clerk users' },
      { status: 500 }
    );
  }
}
