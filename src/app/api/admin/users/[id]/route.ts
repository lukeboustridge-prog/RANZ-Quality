export const runtime = 'nodejs';

/**
 * Admin Single User Endpoints
 *
 * GET /api/admin/users/[id] - Get user details
 * PUT /api/admin/users/[id] - Update user details
 * PATCH /api/admin/users/[id] - Update user status only
 *
 * All mutations are logged to AuthAuditLog.
 *
 * Required role: RANZ_ADMIN or RANZ_STAFF
 */

import { db } from '@/lib/db';
import {
  getSessionFromRequest,
  verifyToken,
  getIPFromRequest,
  logAuthEvent,
  AUTH_ACTIONS,
  revokeAllUserSessions,
  type AuthAction,
} from '@/lib/auth';
import { AuthUserStatus, AuthUserType } from '@prisma/client';

/**
 * User select fields - never include passwordHash.
 */
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  userType: true,
  status: true,
  companyId: true,
  company: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  lockedUntil: true,
  mustChangePassword: true,
  deactivatedAt: true,
  deactivatedBy: true,
  deactivationReason: true,
  ssoId: true,
  ssoProvider: true,
  clerkUserId: true,
  createdBy: true,
};

/**
 * Authenticate and authorize admin request.
 */
async function authenticateAdmin(request: Request): Promise<{
  success: boolean;
  payload?: { sub: string; email: string; role: string };
  error?: Response;
}> {
  const sessionToken = getSessionFromRequest(request);
  if (!sessionToken) {
    return {
      success: false,
      error: Response.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }

  const payload = await verifyToken(sessionToken);
  if (!payload) {
    return {
      success: false,
      error: Response.json({ error: 'Invalid session' }, { status: 401 }),
    };
  }

  const allowedRoles = ['RANZ_ADMIN', 'RANZ_STAFF'];
  if (!allowedRoles.includes(payload.role as string)) {
    return {
      success: false,
      error: Response.json({ error: 'Insufficient permissions' }, { status: 403 }),
    };
  }

  return {
    success: true,
    payload: {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
    },
  };
}

/**
 * GET /api/admin/users/[id]
 * Get single user details.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await authenticateAdmin(request);
    if (!auth.success) return auth.error!;

    const { id: userId } = await params;

    const user = await db.authUser.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({ user });
  } catch (error) {
    console.error('[Admin User GET] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/users/[id]
 * Full user update (profile details, type, company assignment).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ip = getIPFromRequest(request);

  try {
    const auth = await authenticateAdmin(request);
    if (!auth.success) return auth.error!;

    const { id: userId } = await params;

    // Parse request body
    let body: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      userType?: string;
      companyId?: string | null;
    };

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Find existing user
    const existingUser = await db.authUser.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!existingUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate userType if provided
    if (body.userType && !Object.values(AuthUserType).includes(body.userType as AuthUserType)) {
      return Response.json(
        { error: 'Invalid user type', validTypes: Object.values(AuthUserType) },
        { status: 400 }
      );
    }

    // Company ID required for member user types
    const companyRequiredTypes: AuthUserType[] = ['MEMBER_COMPANY_ADMIN', 'MEMBER_COMPANY_USER'];
    const newUserType = (body.userType as AuthUserType) || existingUser.userType;
    const newCompanyId = body.companyId !== undefined ? body.companyId : existingUser.companyId;

    if (companyRequiredTypes.includes(newUserType) && !newCompanyId) {
      return Response.json(
        { error: 'Company ID is required for member user types' },
        { status: 400 }
      );
    }

    // Verify company exists if provided
    if (newCompanyId) {
      const company = await db.authCompany.findUnique({
        where: { id: newCompanyId },
      });
      if (!company) {
        return Response.json({ error: 'Company not found' }, { status: 404 });
      }
    }

    // Build update data
    const updateData: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      userType?: AuthUserType;
      companyId?: string | null;
    } = {};

    if (body.firstName !== undefined) {
      if (typeof body.firstName !== 'string' || body.firstName.trim() === '') {
        return Response.json({ error: 'First name cannot be empty' }, { status: 400 });
      }
      updateData.firstName = body.firstName.trim();
    }

    if (body.lastName !== undefined) {
      if (typeof body.lastName !== 'string' || body.lastName.trim() === '') {
        return Response.json({ error: 'Last name cannot be empty' }, { status: 400 });
      }
      updateData.lastName = body.lastName.trim();
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone?.trim() || null;
    }

    if (body.userType !== undefined) {
      updateData.userType = body.userType as AuthUserType;
    }

    if (body.companyId !== undefined) {
      updateData.companyId = body.companyId || null;
    }

    // Update user
    const updatedUser = await db.authUser.update({
      where: { id: userId },
      data: updateData,
      select: USER_SELECT,
    });

    // Log audit event with previous and new state
    await logAuthEvent({
      action: AUTH_ACTIONS.USER_UPDATED,
      actorId: auth.payload!.sub,
      actorEmail: auth.payload!.email,
      actorRole: auth.payload!.role,
      ipAddress: ip,
      resourceType: 'AuthUser',
      resourceId: userId,
      previousState: {
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        phone: existingUser.phone,
        userType: existingUser.userType,
        companyId: existingUser.companyId,
      },
      newState: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        userType: updatedUser.userType,
        companyId: updatedUser.companyId,
      },
    });

    return Response.json({ user: updatedUser });
  } catch (error) {
    console.error('[Admin User PUT] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Status change only (deactivate, reactivate, suspend).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ip = getIPFromRequest(request);

  try {
    const auth = await authenticateAdmin(request);
    if (!auth.success) return auth.error!;

    const { id: userId } = await params;

    // Parse request body
    let body: {
      status: string;
      reason?: string;
    };

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate status
    if (!body.status || !Object.values(AuthUserStatus).includes(body.status as AuthUserStatus)) {
      return Response.json(
        { error: 'Invalid status', validStatuses: Object.values(AuthUserStatus) },
        { status: 400 }
      );
    }

    const newStatus = body.status as AuthUserStatus;

    // Find existing user
    const existingUser = await db.authUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        deactivatedAt: true,
        deactivatedBy: true,
        deactivationReason: true,
      },
    });

    if (!existingUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const previousStatus = existingUser.status;

    // Build update data based on status change
    const updateData: {
      status: AuthUserStatus;
      deactivatedAt?: Date | null;
      deactivatedBy?: string | null;
      deactivationReason?: string | null;
    } = {
      status: newStatus,
    };

    let auditAction: AuthAction = AUTH_ACTIONS.USER_UPDATED;

    if (newStatus === 'DEACTIVATED') {
      // Deactivate user
      updateData.deactivatedAt = new Date();
      updateData.deactivatedBy = auth.payload!.sub;
      updateData.deactivationReason = body.reason || null;
      auditAction = AUTH_ACTIONS.USER_DEACTIVATED;

      // Revoke all active sessions for this user
      await revokeAllUserSessions(userId, 'account_deactivated', 'QUALITY_PROGRAM');
    } else if (newStatus === 'ACTIVE' && previousStatus === 'DEACTIVATED') {
      // Reactivate user
      updateData.deactivatedAt = null;
      updateData.deactivatedBy = null;
      updateData.deactivationReason = null;
      auditAction = AUTH_ACTIONS.USER_REACTIVATED;
    } else if (newStatus === 'SUSPENDED') {
      // Suspend user
      auditAction = AUTH_ACTIONS.USER_SUSPENDED;

      // Revoke all active sessions for this user
      await revokeAllUserSessions(userId, 'account_suspended', 'QUALITY_PROGRAM');
    }

    // Update user
    const updatedUser = await db.authUser.update({
      where: { id: userId },
      data: updateData,
      select: USER_SELECT,
    });

    // Log audit event
    await logAuthEvent({
      action: auditAction,
      actorId: auth.payload!.sub,
      actorEmail: auth.payload!.email,
      actorRole: auth.payload!.role,
      ipAddress: ip,
      resourceType: 'AuthUser',
      resourceId: userId,
      previousState: {
        status: previousStatus,
        deactivatedAt: existingUser.deactivatedAt,
        deactivatedBy: existingUser.deactivatedBy,
        deactivationReason: existingUser.deactivationReason,
      },
      newState: {
        status: updatedUser.status,
        deactivatedAt: updatedUser.deactivatedAt,
        deactivatedBy: updatedUser.deactivatedBy,
        deactivationReason: updatedUser.deactivationReason,
      },
      metadata: body.reason ? { reason: body.reason } : undefined,
    });

    return Response.json({ user: updatedUser });
  } catch (error) {
    console.error('[Admin User PATCH] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
