import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { COMPLIANCE_THRESHOLDS } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const userRole = sessionClaims?.metadata?.role as string | undefined;
    if (userRole !== "ranz:admin" && userRole !== "ranz:auditor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tier = searchParams.get("tier");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build filter
    const filter: Record<string, unknown> = {};

    if (tier) {
      filter.certificationTier = tier;
    }

    if (search) {
      filter.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { tradingName: { contains: search, mode: "insensitive" } },
        { nzbn: { contains: search } },
      ];
    }

    const organizations = await db.organization.findMany({
      where: filter,
      include: {
        _count: {
          select: {
            members: true,
            documents: true,
            insurancePolicies: true,
            audits: true,
          },
        },
        insurancePolicies: {
          where: {
            expiryDate: { gt: new Date() },
          },
          select: {
            policyType: true,
            expiryDate: true,
          },
        },
        audits: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 1,
          select: {
            rating: true,
            completedAt: true,
          },
        },
      },
      orderBy: [{ complianceScore: "desc" }, { name: "asc" }],
    });

    // Apply status filter after query
    let filteredOrgs = organizations;
    if (status) {
      filteredOrgs = organizations.filter((org) => {
        const score = org.complianceScore;
        if (status === "compliant") return score >= COMPLIANCE_THRESHOLDS.COMPLIANT;
        if (status === "at-risk") return score >= COMPLIANCE_THRESHOLDS.AT_RISK && score < COMPLIANCE_THRESHOLDS.COMPLIANT;
        if (status === "critical") return score < COMPLIANCE_THRESHOLDS.AT_RISK;
        return true;
      });
    }

    // Calculate summary stats
    const stats = {
      total: organizations.length,
      compliant: organizations.filter((o) => o.complianceScore >= COMPLIANCE_THRESHOLDS.COMPLIANT).length,
      atRisk: organizations.filter(
        (o) => o.complianceScore >= COMPLIANCE_THRESHOLDS.AT_RISK && o.complianceScore < COMPLIANCE_THRESHOLDS.COMPLIANT
      ).length,
      critical: organizations.filter((o) => o.complianceScore < COMPLIANCE_THRESHOLDS.AT_RISK).length,
      byTier: {
        ACCREDITED: organizations.filter(
          (o) => o.certificationTier === "ACCREDITED"
        ).length,
        CERTIFIED: organizations.filter(
          (o) => o.certificationTier === "CERTIFIED"
        ).length,
        MASTER_ROOFER: organizations.filter(
          (o) => o.certificationTier === "MASTER_ROOFER"
        ).length,
      },
      avgScore: Math.round(
        organizations.reduce((sum, o) => sum + o.complianceScore, 0) /
          (organizations.length || 1)
      ),
    };

    return NextResponse.json({
      organizations: filteredOrgs,
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
