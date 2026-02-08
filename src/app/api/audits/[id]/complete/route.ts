import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import {
  getAuditFrequencyMonths,
  scheduleFollowUpAudit,
} from "@/lib/audit-scheduling";

const completeAuditSchema = z.object({
  rating: z.enum(["PASS", "PASS_WITH_OBSERVATIONS", "CONDITIONAL_PASS", "FAIL"]),
  summary: z.string().min(10),
  followUpRequired: z.boolean().optional(),
  followUpDueDate: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  createCAPAs: z.boolean().optional().default(true),
});

async function generateCAPANumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.cAPARecord.count({
    where: {
      organizationId,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  return `CAPA-${year}-${(count + 1).toString().padStart(3, "0")}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: auditId } = await params;

    const audit = await db.audit.findFirst({
      where: {
        id: auditId,
        organization: { clerkOrgId: orgId },
      },
      include: { checklist: true, organization: true },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    if (audit.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Audit already completed" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = completeAuditSchema.parse(body);

    // Calculate statistics
    const stats = {
      conformingCount: 0,
      minorNonconformities: 0,
      majorNonconformities: 0,
      observations: 0,
    };

    for (const item of audit.checklist) {
      switch (item.response) {
        case "CONFORMING":
          stats.conformingCount++;
          break;
        case "MINOR_NONCONFORMITY":
          stats.minorNonconformities++;
          break;
        case "MAJOR_NONCONFORMITY":
          stats.majorNonconformities++;
          break;
        case "OBSERVATION":
          stats.observations++;
          break;
      }
    }

    // Create CAPAs for non-conformities if requested
    const createdCAPAs: string[] = [];

    if (data.createCAPAs) {
      const nonConformities = audit.checklist.filter(
        (c) =>
          c.response === "MINOR_NONCONFORMITY" ||
          c.response === "MAJOR_NONCONFORMITY"
      );

      for (const nc of nonConformities) {
        const capaNumber = await generateCAPANumber(audit.organizationId);
        const dueDate = new Date();
        dueDate.setDate(
          dueDate.getDate() + (nc.response === "MAJOR_NONCONFORMITY" ? 30 : 60)
        );

        const capa = await db.cAPARecord.create({
          data: {
            organizationId: audit.organizationId,
            capaNumber,
            auditId: audit.id,
            sourceType: "AUDIT",
            sourceReference: audit.auditNumber,
            title: `${nc.isoElement} - ${nc.response === "MAJOR_NONCONFORMITY" ? "Major" : "Minor"} Non-conformity`,
            description: nc.finding || nc.questionText,
            severity:
              nc.severity ||
              (nc.response === "MAJOR_NONCONFORMITY" ? "MAJOR" : "MINOR"),
            isoElement: nc.isoElement,
            dueDate,
            evidenceKeys: nc.evidenceKeys,
          },
        });

        createdCAPAs.push(capa.id);
      }
    }

    // Determine if follow-up is needed based on rating
    const needsFollowUp =
      data.followUpRequired ||
      data.rating === "FAIL" ||
      data.rating === "CONDITIONAL_PASS";

    // Update audit
    const updatedAudit = await db.audit.update({
      where: { id: auditId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        rating: data.rating,
        summary: data.summary,
        followUpRequired: needsFollowUp,
        followUpDueDate: data.followUpDueDate,
        ...stats,
      },
    });

    // Update organization with tier-based next audit date
    const frequencyMonths = getAuditFrequencyMonths(
      audit.organization.certificationTier
    );
    const nextAuditDue = new Date();
    nextAuditDue.setMonth(nextAuditDue.getMonth() + frequencyMonths);

    await db.organization.update({
      where: { id: audit.organizationId },
      data: {
        lastAuditDate: new Date(),
        nextAuditDue,
      },
    });

    // Auto-schedule follow-up audit for FAIL or CONDITIONAL_PASS
    let followUpAudit = null;
    if (
      data.rating === "FAIL" ||
      data.rating === "CONDITIONAL_PASS"
    ) {
      followUpAudit = await scheduleFollowUpAudit(
        audit.organizationId,
        auditId
      );
    }

    // Recalculate compliance score
    await updateOrganizationComplianceScore(audit.organizationId);

    return NextResponse.json({
      audit: updatedAudit,
      statistics: stats,
      createdCAPAs,
      followUpAudit: followUpAudit
        ? { id: followUpAudit.id, scheduledDate: followUpAudit.scheduledDate }
        : null,
    });
  } catch (error) {
    console.error("Failed to complete audit:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
