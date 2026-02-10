import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metadata = sessionClaims?.metadata as { role?: string } | undefined;
    const userRole = metadata?.role;
    if (userRole !== "ranz:admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizations = await db.organization.findMany({
      select: {
        id: true,
        name: true,
        tradingName: true,
        certificationTier: true,
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            microCredentials: {
              select: {
                id: true,
                status: true,
                definition: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    let totalStaff = 0;
    let totalCredentialsAssigned = 0;
    let totalCredentialsAwarded = 0;
    let orgsWithAwarded = 0;

    const orgReports = organizations.map((org) => {
      const staffCount = org.members.length;
      const allCreds = org.members.flatMap((m) => m.microCredentials);
      const credentialsAssigned = allCreds.length;
      const credentialsAwarded = allCreds.filter(
        (c) => c.status === "AWARDED"
      ).length;

      const credentialsByStatus: Record<string, number> = {
        NOT_STARTED: 0,
        IN_TRAINING: 0,
        ASSESSMENT_PENDING: 0,
        AWARDED: 0,
        EXPIRED: 0,
      };

      for (const cred of allCreds) {
        if (cred.status in credentialsByStatus) {
          credentialsByStatus[cred.status]++;
        }
      }

      // Coverage: staff with at least 1 awarded / total staff
      const staffWithAwarded = org.members.filter((m) =>
        m.microCredentials.some((c) => c.status === "AWARDED")
      ).length;
      const coveragePercent =
        staffCount > 0
          ? Math.round((staffWithAwarded / staffCount) * 100)
          : 0;

      totalStaff += staffCount;
      totalCredentialsAssigned += credentialsAssigned;
      totalCredentialsAwarded += credentialsAwarded;
      if (credentialsAwarded > 0) orgsWithAwarded++;

      return {
        id: org.id,
        name: org.name,
        tradingName: org.tradingName,
        certificationTier: org.certificationTier,
        staffCount,
        credentialsAssigned,
        credentialsAwarded,
        credentialsByStatus,
        coveragePercent,
      };
    });

    // Sort by coverage descending
    orgReports.sort((a, b) => b.coveragePercent - a.coveragePercent);

    const totalOrganizations = organizations.length;
    const overallCoveragePercent =
      totalOrganizations > 0
        ? Math.round((orgsWithAwarded / totalOrganizations) * 100)
        : 0;

    return NextResponse.json({
      summary: {
        totalOrganizations,
        totalStaff,
        totalCredentialsAssigned,
        totalCredentialsAwarded,
        overallCoveragePercent,
      },
      organizations: orgReports,
    });
  } catch (error) {
    console.error("Failed to fetch micro-credential coverage report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
