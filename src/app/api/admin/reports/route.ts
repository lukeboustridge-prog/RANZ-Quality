import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateReport } from "@/lib/reports";
import { z } from "zod/v4";

// Check if user has RANZ admin or auditor role
async function isRanzStaff(): Promise<boolean> {
  const { sessionClaims } = await auth();
  const orgRole = sessionClaims?.org_role as string | undefined;
  return orgRole === "ranz:admin" || orgRole === "ranz:auditor";
}

const reportRequestSchema = z.object({
  reportType: z.enum([
    "COMPLIANCE_SUMMARY",
    "MEMBER_DIRECTORY",
    "AUDIT_SUMMARY",
    "INSURANCE_STATUS",
    "LBP_STATUS",
    "CAPA_SUMMARY",
    "PROJECT_PORTFOLIO",
    "TESTIMONIAL_SUMMARY",
    "TIER_ANALYSIS",
  ]),
  startDate: z.string().transform((s) => new Date(s)).optional(),
  endDate: z.string().transform((s) => new Date(s)).optional(),
  tier: z.enum(["ACCREDITED", "CERTIFIED", "MASTER_ROOFER"]).optional(),
  organizationId: z.string().optional(),
  format: z.enum(["PDF", "CSV", "XLSX", "JSON"]).default("JSON"),
});

export async function GET(req: NextRequest) {
  try {
    const isStaff = await isRanzStaff();
    if (!isStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // List available reports
    const reports = await db.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        reportType: true,
        title: true,
        status: true,
        format: true,
        generatedAt: true,
        createdAt: true,
        createdBy: true,
      },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Failed to list reports:", error);
    return NextResponse.json(
      { error: "Failed to list reports" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const isStaff = await isRanzStaff();
    if (!isStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = reportRequestSchema.parse(body);

    // For JSON format, generate and return immediately
    if (data.format === "JSON") {
      const reportData = await generateReport(data.reportType, {
        startDate: data.startDate,
        endDate: data.endDate,
        tier: data.tier,
        organizationId: data.organizationId,
      });

      // Save report record
      await db.report.create({
        data: {
          reportType: data.reportType,
          title: getReportTitle(data.reportType),
          parameters: {
            startDate: data.startDate?.toISOString(),
            endDate: data.endDate?.toISOString(),
            tier: data.tier,
            organizationId: data.organizationId,
          },
          startDate: data.startDate,
          endDate: data.endDate,
          format: "JSON",
          status: "PENDING",
          generatedAt: new Date(),
          createdBy: userId,
        },
      });

      return NextResponse.json({
        reportType: data.reportType,
        generatedAt: new Date().toISOString(),
        data: reportData,
      });
    }

    // For other formats, create a report record to be processed
    const report = await db.report.create({
      data: {
        reportType: data.reportType,
        title: getReportTitle(data.reportType),
        parameters: {
          startDate: data.startDate?.toISOString(),
          endDate: data.endDate?.toISOString(),
          tier: data.tier,
          organizationId: data.organizationId,
        },
        startDate: data.startDate,
        endDate: data.endDate,
        format: data.format,
        status: "PENDING",
        createdBy: userId,
      },
    });

    // TODO: Queue report generation job for PDF/CSV/XLSX formats

    return NextResponse.json(
      {
        id: report.id,
        status: "PENDING",
        message: "Report generation queued",
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

function getReportTitle(reportType: string): string {
  const titles: Record<string, string> = {
    COMPLIANCE_SUMMARY: "Compliance Summary Report",
    MEMBER_DIRECTORY: "Member Directory",
    AUDIT_SUMMARY: "Audit Summary Report",
    INSURANCE_STATUS: "Insurance Status Report",
    LBP_STATUS: "LBP Status Report",
    CAPA_SUMMARY: "CAPA Summary Report",
    PROJECT_PORTFOLIO: "Project Portfolio Report",
    TESTIMONIAL_SUMMARY: "Testimonial Summary Report",
    TIER_ANALYSIS: "Tier Analysis Report",
  };
  return titles[reportType] || reportType;
}
