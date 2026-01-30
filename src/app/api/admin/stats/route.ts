import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAdminRequest, adminAuthErrorResponse } from "@/lib/auth/admin-api";

export async function GET(request: Request) {
  try {
    // Authenticate admin (works with both Clerk and custom auth)
    const authResult = await authenticateAdminRequest(request, ['RANZ_ADMIN', 'RANZ_STAFF', 'RANZ_INSPECTOR']);
    if (!authResult.success) {
      return adminAuthErrorResponse(authResult);
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    // Parallel queries for stats
    const [
      orgCount,
      orgsByTier,
      avgComplianceScore,
      expiringInsurance,
      openCAPAs,
      upcomingAudits,
      recentAudits,
      unverifiedLBP,
    ] = await Promise.all([
      // Total organizations
      db.organization.count(),

      // Organizations by tier
      db.organization.groupBy({
        by: ["certificationTier"],
        _count: true,
      }),

      // Average compliance score
      db.organization.aggregate({
        _avg: { complianceScore: true },
      }),

      // Expiring insurance (next 30 days)
      db.insurancePolicy.count({
        where: {
          expiryDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
      }),

      // Open CAPAs
      db.cAPARecord.groupBy({
        by: ["status"],
        where: {
          status: { in: ["OPEN", "IN_PROGRESS", "PENDING_VERIFICATION", "OVERDUE"] },
        },
        _count: true,
      }),

      // Upcoming audits (next 30 days)
      db.audit.count({
        where: {
          status: "SCHEDULED",
          scheduledDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
      }),

      // Recently completed audits (last 30 days)
      db.audit.count({
        where: {
          status: "COMPLETED",
          completedAt: { gte: thirtyDaysAgo },
        },
      }),

      // Unverified LBP numbers
      db.organizationMember.count({
        where: {
          lbpNumber: { not: null },
          lbpVerified: false,
        },
      }),
    ]);

    // Process tier counts
    const tierCounts: Record<string, number> = {};
    for (const tier of orgsByTier) {
      tierCounts[tier.certificationTier] = tier._count;
    }

    // Process CAPA counts
    const capaCounts: Record<string, number> = {
      total: 0,
      overdue: 0,
    };
    for (const capa of openCAPAs) {
      capaCounts.total += capa._count;
      if (capa.status === "OVERDUE") {
        capaCounts.overdue = capa._count;
      }
    }

    // Compliance distribution counts
    const compliantCount = await db.organization.count({
      where: { complianceScore: { gte: 90 } },
    });

    const atRiskCount = await db.organization.count({
      where: { complianceScore: { gte: 70, lt: 90 } },
    });

    const criticalCount = await db.organization.count({
      where: { complianceScore: { lt: 70 } },
    });

    return NextResponse.json({
      organizations: {
        total: orgCount,
        byTier: {
          ACCREDITED: tierCounts.ACCREDITED || 0,
          CERTIFIED: tierCounts.CERTIFIED || 0,
          MASTER_ROOFER: tierCounts.MASTER_ROOFER || 0,
        },
        compliance: {
          average: Math.round(avgComplianceScore._avg.complianceScore || 0),
          compliant: compliantCount,
          atRisk: atRiskCount,
          critical: criticalCount,
        },
      },
      insurance: {
        expiringNext30Days: expiringInsurance,
      },
      capa: {
        open: capaCounts.total,
        overdue: capaCounts.overdue,
      },
      audits: {
        upcoming: upcomingAudits,
        recentlyCompleted: recentAudits,
      },
      personnel: {
        unverifiedLBP: unverifiedLBP,
      },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
