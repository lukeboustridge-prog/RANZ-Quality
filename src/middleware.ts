/**
 * Middleware
 *
 * Handles authentication and security headers for all routes.
 * Supports both Clerk and custom auth based on AUTH_MODE environment variable.
 *
 * AUTH_MODE values:
 * - 'clerk' (default): Uses Clerk middleware
 * - 'custom': Uses dual-auth middleware (custom priority, Clerk fallback)
 *
 * Security Headers (QCTL-QP-001):
 * - Content-Security-Policy: Restricts content sources to prevent XSS
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Referrer-Policy: Controls referrer information
 * - Permissions-Policy: Restricts browser features
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Add security headers to response (QCTL-QP-001)
 * Following OWASP recommendations for HTTP security headers
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy - restricts content sources
  // Note: 'unsafe-inline' and 'unsafe-eval' needed for Next.js dev mode
  // In production, consider using nonce-based CSP
  const cspValue = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.clerk.io https://*.clerk.accounts.dev",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.clerk.io https://*.clerk.accounts.dev https://api.clerk.io wss://*.clerk.io https://haveibeenpwned.com https://api.pwnedpasswords.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspValue);

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Prevent XSS attacks (legacy header, but still useful)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/public(.*)",
  "/verify(.*)",
  "/api/auth/validate-session", // Public for satellite apps
  "/api/auth/login",            // Custom auth login
  "/api/auth/logout",           // Custom auth logout
  "/api/auth/forgot-password",  // Password reset request
  "/api/auth/reset-password",   // Password reset
  "/api/auth/activate",         // Account activation
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

const isCronRoute = createRouteMatcher(["/api/cron(.*)"]);

// AUTH_MODE determines which auth system is primary
const AUTH_MODE = process.env.AUTH_MODE || 'clerk';

export default async function middleware(req: NextRequest) {
  // Allow cron routes with secret verification (handled in route)
  if (isCronRoute(req)) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  if (AUTH_MODE === 'custom') {
    // Custom auth is primary - handle public routes separately
    if (isPublicRoute(req)) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }
    return customAuthMiddleware(req);
  } else {
    // Clerk is primary (default) - ALWAYS run clerkMiddleware
    // Clerk handles public routes internally via the route matcher
    return clerkMiddlewareHandler(req);
  }
}

async function customAuthMiddleware(req: NextRequest): Promise<NextResponse> {
  // Dynamic import to avoid loading when using Clerk
  const { dualAuthCheck } = await import('@/lib/auth/middleware/dual-auth');

  const authResult = await dualAuthCheck(req);

  if (!authResult.authenticated) {
    // Redirect to sign-in
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    const redirectResponse = NextResponse.redirect(signInUrl);
    return addSecurityHeaders(redirectResponse);
  }

  const response = NextResponse.next();

  // Add user info to headers for downstream use
  if (authResult.source === 'custom' && authResult.user) {
    response.headers.set('x-user-id', authResult.user.sub);
    response.headers.set('x-user-role', authResult.user.role);
    response.headers.set('x-auth-source', 'custom');
    if (authResult.user.companyId) {
      response.headers.set('x-company-id', authResult.user.companyId);
    }

    // Admin route check for custom auth
    if (isAdminRoute(req)) {
      if (!['RANZ_ADMIN', 'RANZ_STAFF'].includes(authResult.user.role)) {
        const adminRedirect = NextResponse.redirect(new URL('/dashboard', req.url));
        return addSecurityHeaders(adminRedirect);
      }
    }
  } else if (authResult.source === 'clerk' && authResult.clerkUserId) {
    response.headers.set('x-user-id', authResult.clerkUserId);
    response.headers.set('x-auth-source', 'clerk');
    // Note: Clerk role check happens in clerkMiddleware path
  }

  return addSecurityHeaders(response);
}

// Wrap clerkMiddleware to maintain existing behavior
function clerkMiddlewareHandler(req: NextRequest) {
  return clerkMiddleware(async (auth, request) => {
    // Allow public routes without protection
    if (isPublicRoute(request)) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // Protect all other routes
    const authResult = await auth.protect();

    // Check admin routes for RANZ role
    if (isAdminRoute(request)) {
      const sessionClaims = authResult.sessionClaims;
      const metadata = sessionClaims?.metadata as { role?: string } | undefined;
      const userRole = metadata?.role;

      if (userRole !== "ranz:admin" && userRole !== "ranz:auditor") {
        const adminRedirect = NextResponse.redirect(new URL("/dashboard", request.url));
        return addSecurityHeaders(adminRedirect);
      }
    }

    const response = NextResponse.next();
    return addSecurityHeaders(response);
  })(req, {} as any);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
