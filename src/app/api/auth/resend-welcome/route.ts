export const runtime = 'nodejs';

/**
 * Resend Welcome Email Endpoint
 *
 * POST /api/auth/resend-welcome
 *
 * Allows RANZ administrators to resend welcome emails to users
 * who haven't yet activated their accounts.
 *
 * Implements:
 * - AUTH-08: Admin can resend welcome email
 * - Rate limited to 3 per 24 hours per recipient
 * - Invalidates previous tokens before generating new one
 *
 * Required role: RANZ_ADMIN or RANZ_STAFF
 */

import { db } from '@/lib/db';
import {
  getSessionFromRequest,
  verifyToken,
  generateActivationToken,
  sendWelcomeEmail,
  logAuthEvent,
  AUTH_ACTIONS,
  getIPFromRequest,
} from '@/lib/auth';

/**
 * Request body for resending welcome email.
 */
interface ResendWelcomeRequest {
  userId: string;
}

/**
 * Rate limit constants for welcome email resends.
 * Max 3 resends per recipient per 24 hours.
 */
const MAX_RESENDS_PER_DAY = 3;
const RESEND_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: Request): Promise<Response> {
  const ip = getIPFromRequest(request);

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

    // Check admin role
    const allowedRoles = ['RANZ_ADMIN', 'RANZ_STAFF'];
    if (!allowedRoles.includes(payload.role as string)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    let body: ResendWelcomeRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate required field
    if (!body.userId || typeof body.userId !== 'string') {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user and verify PENDING_ACTIVATION status
    const user = await db.authUser.findUnique({
      where: { id: body.userId },
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
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status !== 'PENDING_ACTIVATION') {
      return Response.json(
        { error: 'User account is already activated' },
        { status: 400 }
      );
    }

    // Check resend rate limit (per recipient)
    const windowStart = new Date(Date.now() - RESEND_WINDOW_MS);
    const recentResends = await db.authPasswordReset.count({
      where: {
        userId: user.id,
        requestedAt: { gte: windowStart },
      },
    });

    if (recentResends >= MAX_RESENDS_PER_DAY) {
      return Response.json(
        {
          error: 'Maximum welcome emails sent for today. Try again tomorrow.',
          retryAfter: '24 hours',
        },
        { status: 429 }
      );
    }

    // Invalidate existing unused tokens
    await db.authPasswordReset.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
        usedIp: 'invalidated_by_resend',
      },
    });

    // Generate new activation token
    const ACTIVATION_EXPIRY_DAYS = parseInt(process.env.ACTIVATION_EXPIRY_DAYS || '7', 10);
    const { token: activationToken, tokenHash, expiresAt } = await generateActivationToken(
      user.id,
      ACTIVATION_EXPIRY_DAYS
    );

    // Create new password reset record for activation
    await db.authPasswordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        requestedIp: ip,
        expiresAt,
      },
    });

    // Build activation URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.ranz.co.nz';
    const activationUrl = `${appUrl}/auth/activate?token=${activationToken}`;

    // Send welcome email
    const emailResult = await sendWelcomeEmail({
      to: user.email,
      firstName: user.firstName,
      activationUrl,
      expiresIn: `${ACTIVATION_EXPIRY_DAYS} days`,
    });

    // Log welcome email resent
    await logAuthEvent({
      action: AUTH_ACTIONS.WELCOME_EMAIL_RESENT,
      actorId: payload.sub as string,
      actorEmail: payload.email as string,
      actorRole: payload.role as string,
      ipAddress: ip,
      resourceType: 'AuthUser',
      resourceId: user.id,
      metadata: {
        targetEmail: user.email,
        resendCount: recentResends + 1,
        emailResult: emailResult.error ? { error: emailResult.error } : { id: emailResult.id },
      },
    });

    // Return success
    return Response.json({
      success: true,
      message: 'Welcome email sent.',
      activationExpires: expiresAt,
      resendsToday: recentResends + 1,
      maxResendsPerDay: MAX_RESENDS_PER_DAY,
      emailSent: !emailResult.error,
      emailError: emailResult.error,
    });
  } catch (error) {
    console.error('[Resend Welcome] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
