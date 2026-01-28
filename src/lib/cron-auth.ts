import { NextRequest, NextResponse } from "next/server";
import { env } from "./env";

/**
 * Verifies cron request authentication using CRON_SECRET header.
 * Vercel automatically adds: Authorization: Bearer <CRON_SECRET>
 * Returns 401 response if unauthorized, null if valid.
 */
export function verifyCronRequest(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization");

  // Strict validation - env.CRON_SECRET is guaranteed to exist due to Zod validation
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    console.warn("Unauthorized cron attempt detected", {
      ip: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Invalid or missing CRON_SECRET in Authorization header",
      },
      { status: 401 }
    );
  }

  return null; // Valid request - proceed
}
