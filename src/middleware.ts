import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/public(.*)",
  "/verify(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

const isCronRoute = createRouteMatcher(["/api/cron(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Allow cron routes with secret verification (handled in route)
  if (isCronRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes
  const authResult = await auth.protect();

  // Check admin routes for RANZ role
  if (isAdminRoute(req)) {
    const sessionClaims = authResult.sessionClaims;
    const userRole = sessionClaims?.metadata?.role as string | undefined;

    // Allow ranz:admin and ranz:auditor roles
    if (userRole !== "ranz:admin" && userRole !== "ranz:auditor") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
