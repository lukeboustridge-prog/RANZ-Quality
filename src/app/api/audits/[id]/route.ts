import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const updateAuditSchema = z.object({
  status: z
    .enum(["SCHEDULED", "IN_PROGRESS", "PENDING_REVIEW", "COMPLETED", "CANCELLED"])
    .optional(),
  scheduledDate: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  auditorId: z.string().optional(),
  auditorName: z.string().optional(),
  auditorEmail: z.string().email().optional(),
  scope: z.string().optional(),
  summary: z.string().optional(),
  rating: z
    .enum(["PASS", "PASS_WITH_OBSERVATIONS", "CONDITIONAL_PASS", "FAIL"])
    .optional(),
  followUpRequired: z.boolean().optional(),
  followUpDueDate: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: auditId } = await params;

    const audit = await db.audit.findFirst({
      where: {
        id: auditId,
        organization: { clerkOrgId: orgId },
      },
      include: {
        checklist: {
          orderBy: [{ isoElement: "asc" }, { questionNumber: "asc" }],
        },
        capaRecords: true,
        organization: {
          select: { name: true, certificationTier: true },
        },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    return NextResponse.json(audit);
  } catch (error) {
    console.error("Failed to fetch audit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = updateAuditSchema.parse(body);

    // Set timestamps based on status changes
    const updateData: Record<string, unknown> = { ...data };

    if (data.status === "IN_PROGRESS" && audit.status === "SCHEDULED") {
      updateData.startedAt = new Date();
    }

    if (data.status === "COMPLETED" && audit.status !== "COMPLETED") {
      updateData.completedAt = new Date();

      // Calculate statistics from checklist
      const stats = await db.auditChecklist.groupBy({
        by: ["response"],
        where: { auditId },
        _count: true,
      });

      const statMap: Record<string, number> = {};
      for (const s of stats) {
        if (s.response) {
          statMap[s.response] = s._count;
        }
      }

      updateData.conformingCount = statMap["CONFORMING"] || 0;
      updateData.minorNonconformities = statMap["MINOR_NONCONFORMITY"] || 0;
      updateData.majorNonconformities = statMap["MAJOR_NONCONFORMITY"] || 0;
      updateData.observations = statMap["OBSERVATION"] || 0;

      // Update organization's last audit date
      await db.organization.update({
        where: { id: audit.organizationId },
        data: {
          lastAuditDate: new Date(),
          nextAuditDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });
    }

    const updatedAudit = await db.audit.update({
      where: { id: auditId },
      data: updateData,
    });

    return NextResponse.json(updatedAudit);
  } catch (error) {
    console.error("Failed to update audit:", error);
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: auditId } = await params;

    const audit = await db.audit.findFirst({
      where: {
        id: auditId,
        organization: { clerkOrgId: orgId },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    // Only allow deletion of scheduled audits
    if (audit.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Only scheduled audits can be deleted" },
        { status: 400 }
      );
    }

    await db.audit.delete({ where: { id: auditId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete audit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
