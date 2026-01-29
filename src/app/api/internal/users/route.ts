/**
 * Internal Users API
 *
 * Server-to-server endpoint for satellite apps (Roofing Report) to read user data.
 * Requires X-Internal-API-Key header for authentication.
 *
 * GET /api/internal/users
 *
 * Query params:
 * - userType: comma-separated list (e.g., "RANZ_ADMIN,RANZ_STAFF,RANZ_INSPECTOR")
 * - status: single value (e.g., "ACTIVE")
 * - companyId: filter by company (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  validateInternalApiKey,
  type InternalUsersResponse,
} from '@/lib/auth/internal-api';
import { AuthUserType, AuthUserStatus, Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest
): Promise<NextResponse<InternalUsersResponse | { error: string }>> {
  // Validate internal API key
  if (!validateInternalApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing API key' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const userTypeParam = url.searchParams.get('userType');
    const statusParam = url.searchParams.get('status');
    const companyIdParam = url.searchParams.get('companyId');

    // Build where clause with proper typing
    const where: Prisma.AuthUserWhereInput = {};

    if (userTypeParam) {
      const userTypes = userTypeParam.split(',').map((t) => t.trim());
      // Validate that all provided types are valid AuthUserType values
      const validTypes = userTypes.filter((t) =>
        Object.values(AuthUserType).includes(t as AuthUserType)
      );
      if (validTypes.length > 0) {
        where.userType = { in: validTypes as AuthUserType[] };
      }
    }

    if (statusParam) {
      // Validate that status is a valid AuthUserStatus
      if (Object.values(AuthUserStatus).includes(statusParam as AuthUserStatus)) {
        where.status = statusParam as AuthUserStatus;
      }
    }

    if (companyIdParam) {
      where.companyId = companyIdParam;
    }

    // Query users with company relationship
    // IMPORTANT: Only select non-sensitive fields. Never expose passwordHash.
    const users = await db.authUser.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        userType: true,
        status: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Format response with ISO date strings
    const response: InternalUsersResponse = {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        status: user.status,
        companyId: user.companyId,
        company: user.company,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      })),
      total: users.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Internal API] Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
