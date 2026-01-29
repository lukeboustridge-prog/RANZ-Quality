import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { z } from "zod/v4";

// Check if user has RANZ admin role
async function isRanzAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  const orgRole = sessionClaims?.org_role as string | undefined;
  return orgRole === "ranz:admin";
}

const bulkEmailSchema = z.object({
  action: z.literal("bulk_email"),
  organizationIds: z.array(z.string()).min(1),
  subject: z.string().min(1),
  message: z.string().min(1),
  tier: z.enum(["ACCREDITED", "CERTIFIED", "MASTER_ROOFER"]).optional(),
});

const bulkComplianceRecalcSchema = z.object({
  action: z.literal("recalculate_compliance"),
  organizationIds: z.array(z.string()).optional(), // If empty, recalc all
});

const bulkAuditScheduleSchema = z.object({
  action: z.literal("schedule_audits"),
  organizationIds: z.array(z.string()).min(1),
  auditType: z.enum([
    "INITIAL_CERTIFICATION",
    "SURVEILLANCE",
    "RECERTIFICATION",
    "FOLLOW_UP",
    "SPECIAL",
  ]),
  scheduledDate: z.string().transform((s) => new Date(s)),
  auditorId: z.string().optional(),
  auditorName: z.string().optional(),
  auditorEmail: z.string().email().optional(),
});

const bulkTierUpdateSchema = z.object({
  action: z.literal("update_tier"),
  organizationIds: z.array(z.string()).min(1),
  newTier: z.enum(["ACCREDITED", "CERTIFIED", "MASTER_ROOFER"]),
  reason: z.string().optional(),
});

const bulkActionSchema = z.union([
  bulkEmailSchema,
  bulkComplianceRecalcSchema,
  bulkAuditScheduleSchema,
  bulkTierUpdateSchema,
]);

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await isRanzAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const data = bulkActionSchema.parse(body);

    switch (data.action) {
      case "bulk_email":
        return handleBulkEmail(data);
      case "recalculate_compliance":
        return handleComplianceRecalc(data);
      case "schedule_audits":
        return handleScheduleAudits(data);
      case "update_tier":
        return handleTierUpdate(data);
      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Bulk action failed:", error);
    return NextResponse.json(
      { error: "Bulk action failed" },
      { status: 500 }
    );
  }
}

async function handleBulkEmail(
  data: z.infer<typeof bulkEmailSchema>
): Promise<NextResponse> {
  const organizations = await db.organization.findMany({
    where: {
      id: { in: data.organizationIds },
      ...(data.tier ? { certificationTier: data.tier } : {}),
    },
    include: {
      members: {
        where: { role: "OWNER" },
        select: { email: true },
      },
    },
  });

  let sent = 0;
  const failed: string[] = [];

  for (const org of organizations) {
    const owner = org.members[0];
    if (!owner) {
      failed.push(org.id);
      continue;
    }

    try {
      await createNotification({
        organizationId: org.id,
        type: "SYSTEM",
        channel: "EMAIL",
        priority: "NORMAL",
        title: data.subject,
        message: data.message,
        recipient: owner.email,
      });
      sent++;
    } catch {
      failed.push(org.id);
    }
  }

  return NextResponse.json({
    success: true,
    action: "bulk_email",
    sent,
    failed: failed.length,
    failedIds: failed,
  });
}

async function handleComplianceRecalc(
  data: z.infer<typeof bulkComplianceRecalcSchema>
): Promise<NextResponse> {
  // Import compliance calculation function
  const { calculateComplianceScore } = await import(
    "@/lib/compliance-v2"
  );

  const where = data.organizationIds?.length
    ? { id: { in: data.organizationIds } }
    : {};

  const organizations = await db.organization.findMany({
    where,
    select: { id: true },
  });

  let updated = 0;
  const failed: string[] = [];

  for (const org of organizations) {
    try {
      const result = await calculateComplianceScore(org.id);
      await db.organization.update({
        where: { id: org.id },
        data: { complianceScore: result.overallScore },
      });
      updated++;
    } catch {
      failed.push(org.id);
    }
  }

  return NextResponse.json({
    success: true,
    action: "recalculate_compliance",
    updated,
    failed: failed.length,
    failedIds: failed,
  });
}

async function handleScheduleAudits(
  data: z.infer<typeof bulkAuditScheduleSchema>
): Promise<NextResponse> {
  const organizations = await db.organization.findMany({
    where: { id: { in: data.organizationIds } },
    select: { id: true, name: true },
  });

  let scheduled = 0;
  const failed: string[] = [];

  for (const org of organizations) {
    try {
      // Generate audit number
      const year = new Date().getFullYear();
      const count = await db.audit.count({
        where: { auditNumber: { startsWith: `AUD-${year}-` } },
      });
      const auditNumber = `AUD-${year}-${(count + 1).toString().padStart(3, "0")}`;

      await db.audit.create({
        data: {
          organizationId: org.id,
          auditNumber,
          auditType: data.auditType,
          status: "SCHEDULED",
          scheduledDate: data.scheduledDate,
          auditorId: data.auditorId,
          auditorName: data.auditorName,
          auditorEmail: data.auditorEmail,
          isoElements: [], // Will be set when audit starts
        },
      });

      // Update organization's next audit date
      await db.organization.update({
        where: { id: org.id },
        data: { nextAuditDue: data.scheduledDate },
      });

      scheduled++;
    } catch {
      failed.push(org.id);
    }
  }

  return NextResponse.json({
    success: true,
    action: "schedule_audits",
    scheduled,
    failed: failed.length,
    failedIds: failed,
  });
}

async function handleTierUpdate(
  data: z.infer<typeof bulkTierUpdateSchema>
): Promise<NextResponse> {
  const now = new Date();
  let updated = 0;
  const failed: string[] = [];

  for (const orgId of data.organizationIds) {
    try {
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { certificationTier: true },
      });

      if (!org) {
        failed.push(orgId);
        continue;
      }

      const previousTier = org.certificationTier;

      await db.organization.update({
        where: { id: orgId },
        data: {
          certificationTier: data.newTier,
          tierPromotedAt: now,
        },
      });

      // Send notification about tier change
      const orgDetails = await db.organization.findUnique({
        where: { id: orgId },
        include: {
          members: {
            where: { role: "OWNER" },
            select: { email: true },
          },
        },
      });

      if (orgDetails?.members[0]) {
        const tierLabels: Record<string, string> = {
          ACCREDITED: "Accredited",
          CERTIFIED: "Certified",
          MASTER_ROOFER: "Master Roofer",
        };

        await createNotification({
          organizationId: orgId,
          type: "TIER_CHANGE",
          channel: "EMAIL",
          priority: "NORMAL",
          title: "Certification Tier Updated",
          message: `Your certification tier has been updated from ${tierLabels[previousTier]} to ${tierLabels[data.newTier]}.${data.reason ? `\n\nReason: ${data.reason}` : ""}`,
          recipient: orgDetails.members[0].email,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        });
      }

      updated++;
    } catch {
      failed.push(orgId);
    }
  }

  return NextResponse.json({
    success: true,
    action: "update_tier",
    updated,
    failed: failed.length,
    failedIds: failed,
  });
}
