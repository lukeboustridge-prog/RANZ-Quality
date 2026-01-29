/**
 * POST /api/auth/login
 *
 * Authenticates users with email and password credentials.
 * Creates a session and returns a JWT in an HttpOnly cookie.
 *
 * Security features:
 * - Rate limiting via Upstash Redis (5 attempts per 15 minutes)
 * - Progressive lockout (5/10/15/20 attempts)
 * - Timing attack prevention with dummy hash
 * - Generic error messages to prevent user enumeration
 * - All attempts logged to AuthAuditLog
 *
 * Requirements:
 * - AUTH-01: Login with email/password
 * - AUTH-05: Progressive lockout
 * - AUTH-06: 8-hour session lifetime
 * - SECR-01: Audit logging
 * - SECR-06: Rate limiting
 * - SECR-07: Suspicious login detection and notification (for CUSTOM auth mode users)
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyPassword,
  signToken,
  createSessionCookie,
  calculateSessionExpiry,
  hashToken,
  checkRateLimit,
  authRateLimiters,
  getIPFromRequest,
  getRateLimitIdentifier,
  isAccountLocked,
  calculateLockoutExpiry,
  logAuthEvent,
  AUTH_ACTIONS,
} from '@/lib/auth';
import {
  analyzeLogin,
  handleSuspiciousLogin,
} from '@/lib/auth/security/suspicious-login';

// Dummy hash for timing attack prevention
// This ensures we always run bcrypt.compare even when user doesn't exist
const DUMMY_HASH = '$2b$12$dummy.hash.for.timing.attack.prevention.xyz';

interface LoginRequestBody {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  const ip = getIPFromRequest(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    // Parse request body
    const body = await request.json() as LoginRequestBody;
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit check
    const identifier = getRateLimitIdentifier(request, normalizedEmail);
    const rateLimitResult = await checkRateLimit(authRateLimiters.login, identifier);

    if (!rateLimitResult.allowed) {
      // Log rate limited attempt
      await logAuthEvent({
        action: AUTH_ACTIONS.LOGIN_RATE_LIMITED,
        actorEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        metadata: {
          retryAfter: rateLimitResult.retryAfter,
          remaining: rateLimitResult.remaining,
        },
      });

      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          },
        }
      );
    }

    // Find user by email
    const user = await db.authUser.findUnique({
      where: { email: normalizedEmail },
      include: {
        company: true,
      },
    });

    // User not found - verify dummy hash to prevent timing attacks
    if (!user) {
      await verifyPassword(password, DUMMY_HASH);

      await logAuthEvent({
        action: AUTH_ACTIONS.LOGIN_FAILED,
        actorEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        metadata: { reason: 'user_not_found' },
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user has a password (not SSO-only)
    if (!user.passwordHash) {
      await logAuthEvent({
        action: AUTH_ACTIONS.LOGIN_FAILED,
        actorId: user.id,
        actorEmail: user.email,
        ipAddress: ip,
        userAgent,
        metadata: { reason: 'no_password_set' },
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === 'DEACTIVATED' || user.status === 'SUSPENDED') {
      await logAuthEvent({
        action: AUTH_ACTIONS.LOGIN_FAILED,
        actorId: user.id,
        actorEmail: user.email,
        ipAddress: ip,
        userAgent,
        metadata: { reason: 'account_inactive', status: user.status },
      });

      return NextResponse.json(
        { error: 'Account is not active. Please contact support.' },
        { status: 401 }
      );
    }

    // Check lockout
    if (isAccountLocked(user.lockedUntil)) {
      await logAuthEvent({
        action: AUTH_ACTIONS.LOGIN_FAILED,
        actorId: user.id,
        actorEmail: user.email,
        ipAddress: ip,
        userAgent,
        metadata: { reason: 'account_locked', lockedUntil: user.lockedUntil },
      });

      return NextResponse.json(
        {
          error: 'Account is temporarily locked due to too many failed login attempts.',
          lockedUntil: user.lockedUntil,
        },
        { status: 423 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts and potentially lock account
      const newFailedAttempts = user.failedLoginAttempts + 1;
      const lockedUntil = calculateLockoutExpiry(newFailedAttempts);

      await db.authUser.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lockedUntil,
        },
      });

      await logAuthEvent({
        action: AUTH_ACTIONS.LOGIN_FAILED,
        actorId: user.id,
        actorEmail: user.email,
        ipAddress: ip,
        userAgent,
        metadata: {
          reason: 'invalid_password',
          failedAttempts: newFailedAttempts,
          lockedUntil,
        },
      });

      // If this attempt triggered a lockout, log that too
      if (lockedUntil) {
        await logAuthEvent({
          action: AUTH_ACTIONS.ACCOUNT_LOCKED,
          actorId: user.id,
          actorEmail: user.email,
          ipAddress: ip,
          userAgent,
          metadata: {
            failedAttempts: newFailedAttempts,
            lockedUntil,
          },
        });
      }

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Success path - Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = calculateSessionExpiry();

    // Sign JWT token
    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.userType,
      companyId: user.companyId ?? undefined,
      sessionId,
      type: 'access',
    });

    // Hash token for database storage
    const tokenHash = await hashToken(token);

    // Create session in database
    await db.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash,
        userAgent,
        ipAddress: ip,
        application: 'QUALITY_PROGRAM',
        expiresAt,
      },
    });

    // Reset failed login attempts and update last login info
    await db.authUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    // Log successful login
    await logAuthEvent({
      action: AUTH_ACTIONS.LOGIN_SUCCESS,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.userType,
      ipAddress: ip,
      userAgent,
      resourceType: 'AuthSession',
      resourceId: sessionId,
      metadata: {
        companyId: user.companyId,
        mustChangePassword: user.mustChangePassword,
      },
    });

    // Check for suspicious activity (SECR-07)
    // Only check for users on CUSTOM auth mode (not needed for CLERK users as Clerk handles this)
    if (user.authMode === 'CUSTOM') {
      const suspicion = await analyzeLogin({
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        userAgent: userAgent || null,
        timestamp: new Date(),
      });

      if (suspicion.isSuspicious) {
        // Send notification but don't block login
        // Fire-and-forget - don't await or let errors break the login flow
        handleSuspiciousLogin(
          {
            userId: user.id,
            userEmail: user.email,
            ipAddress: ip,
            userAgent: userAgent || null,
            timestamp: new Date(),
          },
          suspicion
        ).catch((err) => {
          console.error('[Suspicious Login Notification Error]', err);
        });
      }
    }

    // Create session cookie
    const cookie = createSessionCookie(token, expiresAt);

    // Return success response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        mustChangePassword: user.mustChangePassword,
        companyId: user.companyId,
        companyName: user.company?.name,
      },
    });

    response.headers.set('Set-Cookie', cookie);

    return response;
  } catch (error) {
    // Log error but don't expose details to client
    console.error('[Login Error]', error);

    await logAuthEvent({
      action: AUTH_ACTIONS.LOGIN_ERROR,
      ipAddress: ip,
      userAgent,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
