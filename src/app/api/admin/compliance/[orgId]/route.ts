import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { calculateComplianceScore } from "@/lib/compliance-v2";

// Check if user has RANZ admin or auditor role
async function isRanzStaff(): Promise<boolean> {
  const { sessionClaims } = await auth();
  const orgRole = sessionClaims?.org_role as string | undefined;
  return orgRole === "ranz:admin" || orgRole === "ranz:auditor";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    // Authorization check
    const isStaff = await isRanzStaff();
    if (!isStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get orgId from params
    const { orgId } = await params;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Validate organization exists
    const organization = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        tradingName: true,
        certificationTier: true,
        complianceScore: true,
        lastAuditDate: true,
        nextAuditDue: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Calculate full compliance breakdown
    const complianceResult = await calculateComplianceScore(orgId);

    // Return structured response matching frontend needs
    return NextResponse.json({
      organizationId: organization.id,
      organizationName: organization.name,
      tradingName: organization.tradingName,
      tier: organization.certificationTier,
      overallScore: complianceResult.overallScore,
      breakdown: {
        documentation: {
          score: complianceResult.breakdown.documentation.score,
          weight: complianceResult.breakdown.documentation.weight,
          completeElements: complianceResult.breakdown.documentation.elements.filter(
            (e) => e.hasApprovedDoc
          ).length,
          totalElements: complianceResult.breakdown.documentation.elements.length,
        },
        insurance: {
          score: complianceResult.breakdown.insurance.score,
          weight: complianceResult.breakdown.insurance.weight,
          validPolicies: complianceResult.breakdown.insurance.policies.filter(
            (p) => p.isValid
          ).length,
          requiredPolicies: complianceResult.breakdown.insurance.policies.filter(
            (p) => p.required
          ).length,
        },
        personnel: {
          score: complianceResult.breakdown.personnel.score,
          weight: complianceResult.breakdown.personnel.weight,
          ...complianceResult.breakdown.personnel.details,
        },
        audit: {
          score: complianceResult.breakdown.audit.score,
          weight: complianceResult.breakdown.audit.weight,
          ...complianceResult.breakdown.audit.details,
          lastAuditDate: complianceResult.breakdown.audit.details.lastAuditDate?.toISOString() || null,
        },
      },
      issues: complianceResult.issues.map((issue) => ({
        category: issue.category,
        severity: issue.severity,
        message: issue.message,
        actionRequired: issue.actionRequired || null,
      })),
      tierEligibility: complianceResult.tierEligibility,
      lastAuditDate: organization.lastAuditDate?.toISOString() || null,
      nextAuditDue: organization.nextAuditDue?.toISOString() || null,
    });
  } catch (error) {
    console.error("Failed to fetch compliance breakdown:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch compliance breakdown",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
