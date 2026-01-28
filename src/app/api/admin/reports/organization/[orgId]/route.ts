import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { calculateComplianceScore } from "@/lib/compliance-v2";
import { renderToBuffer } from "@react-pdf/renderer";
import { ComplianceReportPDF } from "@/components/reports/pdf/compliance-report";
import { createAuditLog } from "@/lib/audit-log";
import { randomUUID } from "crypto";

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

    // Fetch organization
    const organization = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        tradingName: true,
        nzbn: true,
        certificationTier: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Calculate compliance using canonical engine
    const complianceResult = await calculateComplianceScore(orgId);

    // Generate report ID
    const reportId = `RPT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const generatedAt = new Date();

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      ComplianceReportPDF({
        organization,
        complianceResult,
        generatedAt,
        reportId,
      })
    );

    // Create audit log for PDF generation
    await createAuditLog({
      action: "EXPORT",
      resourceType: "ComplianceReport",
      resourceId: orgId,
      metadata: {
        format: "PDF",
        reportId,
        complianceScore: complianceResult.overallScore,
        generatedBy: userId,
      },
    });

    // Return PDF response with proper headers
    const filename = `compliance-report-${organization.name
      .toLowerCase()
      .replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

    // Convert Buffer to Uint8Array for Response body
    const pdfArray = new Uint8Array(pdfBuffer);

    return new Response(pdfArray, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate compliance report PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
