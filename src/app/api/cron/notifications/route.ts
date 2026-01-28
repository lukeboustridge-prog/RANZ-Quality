import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  processScheduledNotifications,
  retryFailedNotifications,
  notifyInsuranceExpiry,
  notifyCapaOverdue,
} from "@/lib/notifications";
import { verifyCronRequest } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  const authError = verifyCronRequest(req);
  if (authError) return authError;

  try {
    const results = {
      scheduledSent: 0,
      retriesSent: 0,
      insuranceAlerts: 0,
      capaAlerts: 0,
    };

    // 1. Process scheduled notifications
    results.scheduledSent = await processScheduledNotifications();

    // 2. Retry failed notifications
    results.retriesSent = await retryFailedNotifications();

    // 3. Check for insurance expiries and send alerts
    results.insuranceAlerts = await checkInsuranceExpiries();

    // 4. Check for overdue CAPAs
    results.capaAlerts = await checkOverdueCAPAs();

    return NextResponse.json({
      success: true,
      ...results,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Notification cron failed:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}

async function checkInsuranceExpiries(): Promise<number> {
  const now = new Date();
  let alertsSent = 0;

  // Get policies expiring in 90, 60, or 30 days that haven't been alerted
  const expiringPolicies = await db.insurancePolicy.findMany({
    where: {
      OR: [
        // 90 days
        {
          expiryDate: {
            gte: new Date(now.getTime() + 89 * 24 * 60 * 60 * 1000),
            lte: new Date(now.getTime() + 91 * 24 * 60 * 60 * 1000),
          },
          alert90Sent: false,
        },
        // 60 days
        {
          expiryDate: {
            gte: new Date(now.getTime() + 59 * 24 * 60 * 60 * 1000),
            lte: new Date(now.getTime() + 61 * 24 * 60 * 60 * 1000),
          },
          alert60Sent: false,
        },
        // 30 days
        {
          expiryDate: {
            gte: new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000),
            lte: new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000),
          },
          alert30Sent: false,
        },
      ],
    },
    include: {
      organization: {
        include: {
          members: {
            where: { role: "OWNER" },
            select: { email: true, phone: true },
          },
        },
      },
    },
  });

  for (const policy of expiringPolicies) {
    const daysUntilExpiry = Math.ceil(
      (policy.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    const owner = policy.organization.members[0];
    if (!owner) continue;

    const policyTypeLabels: Record<string, string> = {
      PUBLIC_LIABILITY: "Public Liability",
      PROFESSIONAL_INDEMNITY: "Professional Indemnity",
      STATUTORY_LIABILITY: "Statutory Liability",
    };

    await notifyInsuranceExpiry({
      organizationId: policy.organizationId,
      businessName: policy.organization.name,
      policyType: policyTypeLabels[policy.policyType] || policy.policyType,
      daysUntilExpiry,
      ownerEmail: owner.email,
      ownerPhone: owner.phone || undefined,
    });

    // Mark alert as sent
    const updateData: Record<string, boolean> = {};
    if (daysUntilExpiry >= 85 && daysUntilExpiry <= 95) {
      updateData.alert90Sent = true;
    } else if (daysUntilExpiry >= 55 && daysUntilExpiry <= 65) {
      updateData.alert60Sent = true;
    } else if (daysUntilExpiry >= 25 && daysUntilExpiry <= 35) {
      updateData.alert30Sent = true;
    }

    await db.insurancePolicy.update({
      where: { id: policy.id },
      data: updateData,
    });

    alertsSent++;
  }

  return alertsSent;
}

async function checkOverdueCAPAs(): Promise<number> {
  const now = new Date();
  let alertsSent = 0;

  // Find CAPAs that are past due and not closed
  const overdueCAPAs = await db.cAPARecord.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      dueDate: { lt: now },
    },
    include: {
      organization: {
        include: {
          members: {
            where: { role: { in: ["OWNER", "ADMIN"] } },
            select: { email: true, phone: true, clerkUserId: true },
          },
        },
      },
    },
  });

  for (const capa of overdueCAPAs) {
    // Update status to OVERDUE
    await db.cAPARecord.update({
      where: { id: capa.id },
      data: { status: "OVERDUE" },
    });

    // Find assignee or default to owner
    const assignee =
      capa.organization.members.find(
        (m) => m.clerkUserId === capa.assignedTo
      ) || capa.organization.members[0];

    if (!assignee) continue;

    await notifyCapaOverdue({
      organizationId: capa.organizationId,
      capaTitle: capa.title,
      assigneeEmail: assignee.email,
      assigneePhone: assignee.phone || undefined,
    });

    alertsSent++;
  }

  return alertsSent;
}
