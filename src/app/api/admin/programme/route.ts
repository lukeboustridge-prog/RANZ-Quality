import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin or auditor role
    const metadata = sessionClaims?.metadata as { role?: string } | undefined;
    const userRole = metadata?.role;
    if (userRole !== "ranz:admin" && userRole !== "ranz:auditor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build filter
    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.organization = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { tradingName: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const enrolments = await db.programmeEnrolment.findMany({
      where: filter,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            tradingName: true,
            nzbn: true,
            certificationTier: true,
            complianceScore: true,
            email: true,
            city: true,
          },
        },
      },
      orderBy: [
        // PENDING first (most actionable), then by appliedAt desc
        { status: "asc" },
        { appliedAt: "desc" },
      ],
    });

    return NextResponse.json(enrolments);
  } catch (error) {
    console.error("Failed to fetch programme enrolments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
