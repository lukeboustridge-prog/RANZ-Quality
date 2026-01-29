/**
 * Middleware
 *
 * Handles authentication for all routes.
 * Supports both Clerk and custom auth based on AUTH_MODE environment variable.
 *
 * AUTH_MODE values:
 * - 'clerk' (default): Uses Clerk middleware
 * - 'custom': Uses dual-auth middleware (custom priority, Clerk fallback)
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  // Allow public routes without auth
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Allow cron routes with secret verification (handled in route)
  if (isCronRoute(req)) {
    return NextResponse.next();
  }

  if (AUTH_MODE === 'custom') {
    // Custom auth is primary
    return customAuthMiddleware(req);
  } else {
    // Clerk is primary (default)
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
    return NextResponse.redirect(signInUrl);
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
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  } else if (authResult.source === 'clerk' && authResult.clerkUserId) {
    response.headers.set('x-user-id', authResult.clerkUserId);
    response.headers.set('x-auth-source', 'clerk');
    // Note: Clerk role check happens in clerkMiddleware path
  }

  return response;
}

// Wrap clerkMiddleware to maintain existing behavior
function clerkMiddlewareHandler(req: NextRequest) {
  return clerkMiddleware(async (auth, request) => {
    const authResult = await auth.protect();

    // Check admin routes for RANZ role
    if (isAdminRoute(request)) {
      const sessionClaims = authResult.sessionClaims;
      const metadata = sessionClaims?.metadata as { role?: string } | undefined;
      const userRole = metadata?.role;

      if (userRole !== "ranz:admin" && userRole !== "ranz:auditor") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    return NextResponse.next();
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
