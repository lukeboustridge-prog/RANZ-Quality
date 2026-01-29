export const runtime = 'nodejs';

/**
 * Account Activation Endpoint
 *
 * POST /api/auth/activate
 *
 * Allows users to activate their accounts and set their passwords.
 * Called when user clicks the activation link in their welcome email.
 *
 * Security:
 * - Validates activation token (single-use)
 * - Enforces password complexity requirements
 * - Tokens expire per AUTH-09 configuration
 * - Does NOT auto-login (user must login after activation)
 */

import { db } from '@/lib/db';
import {
  validatePasswordResetToken,
  hashPassword,
  validatePasswordFull,
  logAuthEvent,
  AUTH_ACTIONS,
  getIPFromRequest,
} from '@/lib/auth';

/**
 * Request body for account activation.
 */
interface ActivateAccountRequest {
  token: string;
  password: string;
}

export async function POST(request: Request): Promise<Response> {
  const ip = getIPFromRequest(request);

  try {
    // Parse request body
    let body: ActivateAccountRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate required fields
    if (!body.token || typeof body.token !== 'string') {
      return Response.json({ error: 'Activation token is required' }, { status: 400 });
    }

    if (!body.password || typeof body.password !== 'string') {
      return Response.json({ error: 'Password is required' }, { status: 400 });
    }

    // Validate token (reusing password reset validation)
    const validation = await validatePasswordResetToken(body.token);

    if (!validation.valid) {
      // Log failed activation attempt
      await logAuthEvent({
        action: AUTH_ACTIONS.ACCOUNT_ACTIVATION_EXPIRED,
        ipAddress: ip,
        metadata: { reason: validation.reason },
      });

      // User-friendly error messages
      let errorMessage: string;
      switch (validation.reason) {
        case 'token_not_found':
          errorMessage = 'Invalid activation link. Please contact support for a new invitation.';
          break;
        case 'token_already_used':
          errorMessage = 'This activation link has already been used. Please try logging in or contact support.';
          break;
        case 'token_expired':
          errorMessage = 'This activation link has expired. Please contact support for a new invitation.';
          break;
        default:
          errorMessage = 'Invalid activation link. Please contact support for assistance.';
      }

      return Response.json({ error: errorMessage }, { status: 400 });
    }

    // Get user and verify status is PENDING_ACTIVATION
    const user = await db.authUser.findUnique({
      where: { id: validation.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        userType: true,
      },
    });

    if (!user) {
      return Response.json({ error: 'User account not found' }, { status: 404 });
    }

    if (user.status !== 'PENDING_ACTIVATION') {
      // Already activated - guide user to login
      return Response.json(
        {
          error: 'Account has already been activated. Please log in.',
          redirectTo: '/auth/login',
        },
        { status: 400 }
      );
    }

    // Validate password complexity and breach check (QCTL-QP-002)
    const passwordValidation = await validatePasswordFull(body.password);
    if (!passwordValidation.valid) {
      return Response.json(
        {
          error: 'Password does not meet requirements',
          requirements: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // Hash password and activate account
    const hashedPassword = await hashPassword(body.password);

    // Use transaction to ensure atomicity
    await db.$transaction([
      // Update user to ACTIVE status with password
      db.authUser.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
          passwordHash: hashedPassword,
          mustChangePassword: false,
          // Note: activatedAt is not in schema, using passwordChangedAt for tracking
          passwordChangedAt: new Date(),
        },
      }),
      // Mark all unused reset/activation tokens as used
      db.authPasswordReset.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
          usedIp: ip,
        },
      }),
    ]);

    // Log successful activation
    await logAuthEvent({
      action: AUTH_ACTIONS.ACCOUNT_ACTIVATED,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.userType,
      ipAddress: ip,
      resourceType: 'AuthUser',
      resourceId: user.id,
      metadata: {
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });

    // Return success - do NOT auto-login (per security best practice)
    return Response.json({
      success: true,
      message: 'Account activated successfully. Please log in.',
      redirectTo: '/auth/login',
    });
  } catch (error) {
    console.error('[Account Activation] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
