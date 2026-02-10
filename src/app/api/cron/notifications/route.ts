import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  processScheduledNotifications,
  retryFailedNotifications,
  notifyInsuranceExpiry,
  notifyCapaOverdue,
  createNotification,
  notifyAuditScheduled,
} from "@/lib/notifications";
import { verifyCronRequest } from "@/lib/cron-auth";
import { getOrganizationsNeedingAudit, scheduleAudit } from "@/lib/audit-scheduling";

export async function GET(req: NextRequest) {
  const authError = verifyCronRequest(req);
  if (authError) return authError;

  try {
    const results = {
      scheduledSent: 0,
      retriesSent: 0,
      insuranceAlerts: 0,
      capaAlerts: 0,
      documentReviewAlerts: 0,
      programmeRenewals: 0,
      auditsScheduled: 0,
      auditReminders: 0,
    };

    // 1. Process scheduled notifications
    results.scheduledSent = await processScheduledNotifications();

    // 2. Retry failed notifications
    results.retriesSent = await retryFailedNotifications();

    // 3. Check for insurance expiries and send alerts
    results.insuranceAlerts = await checkInsuranceExpiries();

    // 4. Check for overdue CAPAs
    results.capaAlerts = await checkOverdueCAPAs();

    // 5. Check for document review due dates
    results.documentReviewAlerts = await checkDocumentReviewDueDates();

    // 6. Check for programme renewal dates
    results.programmeRenewals = await checkProgrammeRenewals();

    // 7. Auto-schedule audits based on tier frequency
    results.auditsScheduled = await checkAuditScheduling();

    // 8. Send reminders for upcoming audits
    results.auditReminders = await checkAuditReminders();

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
            select: { email: true, phone: true, clerkUserId: true },
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

    // Determine which flag to update
    const updateData: Record<string, boolean> = {};
    if (daysUntilExpiry >= 85 && daysUntilExpiry <= 95) {
      updateData.alert90Sent = true;
    } else if (daysUntilExpiry >= 55 && daysUntilExpiry <= 65) {
      updateData.alert60Sent = true;
    } else if (daysUntilExpiry >= 25 && daysUntilExpiry <= 35) {
      updateData.alert30Sent = true;
    }

    try {
      // Atomic transaction: notification + flag update
      await db.$transaction(async (tx) => {
        // Send notification (creates record in Notification table)
        await notifyInsuranceExpiry({
          organizationId: policy.organizationId,
          businessName: policy.organization.name,
          policyType: policyTypeLabels[policy.policyType] || policy.policyType,
          daysUntilExpiry,
          ownerEmail: owner.email,
          ownerPhone: owner.phone || undefined,
          ownerUserId: owner.clerkUserId,  // NEW: Link to owner user
        });

        // Mark alert as sent (same transaction)
        await tx.insurancePolicy.update({
          where: { id: policy.id },
          data: updateData,
        });
      });

      alertsSent++;
    } catch (error) {
      // Transaction failed - neither notification nor flag update committed
      const alertTier = updateData.alert90Sent ? "90-day" :
                        updateData.alert60Sent ? "60-day" :
                        updateData.alert30Sent ? "30-day" : "unknown";
      console.error(
        `Failed to send ${alertTier} insurance expiry alert for policy ${policy.id}:`,
        error
      );
      // Continue with next policy - don't fail entire cron
    }
  }

  return alertsSent;
}

async function checkDocumentReviewDueDates(): Promise<number> {
  const now = new Date();
  let alertsSent = 0;

  // Get APPROVED documents with review due dates approaching (30 days or 7 days) or overdue
  const documentsNeedingReview = await db.document.findMany({
    where: {
      status: "APPROVED",
      deletedAt: null,
      reviewDueDate: { not: null },
      OR: [
        // 30 days out (±2 day window)
        {
          reviewDueDate: {
            gte: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
            lte: new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000),
          },
          reviewAlert30Sent: false,
        },
        // 7 days out (±2 day window)
        {
          reviewDueDate: {
            gte: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
            lte: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
          },
          reviewAlert7Sent: false,
        },
        // Overdue (past due, 7-day alert not yet sent)
        {
          reviewDueDate: { lt: now },
          reviewAlert7Sent: false,
        },
      ],
    },
    include: {
      organization: {
        include: {
          members: {
            where: { role: "OWNER" },
            select: { email: true, phone: true, clerkUserId: true },
          },
        },
      },
    },
  });

  for (const doc of documentsNeedingReview) {
    const owner = doc.organization.members[0];
    if (!owner || !doc.reviewDueDate) continue;

    const daysUntilDue = Math.ceil(
      (doc.reviewDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Determine which flag to update
    const updateData: Record<string, boolean> = {};
    if (daysUntilDue > 9) {
      updateData.reviewAlert30Sent = true;
    } else {
      updateData.reviewAlert7Sent = true;
    }

    const urgency = daysUntilDue <= 0 ? "overdue" : `due in ${daysUntilDue} days`;

    try {
      await db.$transaction(async (tx) => {
        await createNotification({
          organizationId: doc.organizationId,
          userId: owner.clerkUserId,
          type: "DOCUMENT_REVIEW_DUE",
          channel: "EMAIL",
          priority: daysUntilDue <= 0 ? "HIGH" : "NORMAL",
          title: `Document Review ${daysUntilDue <= 0 ? "Overdue" : "Due"} - ${doc.title}`,
          message: `The document "${doc.title}" is ${urgency} for review. ISO 9000 Element 8 (Document Control) requires periodic review of approved documents. Please review and update as needed.`,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/documents`,
          recipient: owner.email,
        });

        await tx.document.update({
          where: { id: doc.id },
          data: updateData,
        });
      });

      alertsSent++;
    } catch (error) {
      console.error(
        `Failed to send document review alert for document ${doc.id}:`,
        error
      );
    }
  }

  return alertsSent;
}

async function checkProgrammeRenewals(): Promise<number> {
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  let alertsSent = 0;

  // Get ACTIVE enrolments with anniversary dates within 90 days
  const enrolments = await db.programmeEnrolment.findMany({
    where: {
      status: "ACTIVE",
      anniversaryDate: { lte: in90Days, gt: now },
    },
    include: {
      organization: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  for (const enrolment of enrolments) {
    if (!enrolment.anniversaryDate) continue;

    const daysUntilAnniversary = Math.ceil(
      (enrolment.anniversaryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    const formattedDate = enrolment.anniversaryDate.toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Determine which alerts to send
    const alertsToSend: { days: number; flag: "renewalAlert90Sent" | "renewalAlert60Sent" | "renewalAlert30Sent" }[] = [];

    if (daysUntilAnniversary <= 90 && !enrolment.renewalAlert90Sent) {
      alertsToSend.push({ days: 90, flag: "renewalAlert90Sent" });
    }
    if (daysUntilAnniversary <= 60 && !enrolment.renewalAlert60Sent) {
      alertsToSend.push({ days: 60, flag: "renewalAlert60Sent" });
    }
    if (daysUntilAnniversary <= 30 && !enrolment.renewalAlert30Sent) {
      alertsToSend.push({ days: 30, flag: "renewalAlert30Sent" });
    }

    if (alertsToSend.length === 0) continue;

    try {
      await db.$transaction(async (tx) => {
        // Send a notification for each triggered alert tier
        for (const alert of alertsToSend) {
          await createNotification({
            organizationId: enrolment.organizationId,
            type: "PROGRAMME_RENEWAL",
            channel: "EMAIL",
            priority: daysUntilAnniversary <= 30 ? "HIGH" : "NORMAL",
            title: "RoofWright Programme Renewal Reminder",
            message: `Your RoofWright programme membership is due for renewal in ${daysUntilAnniversary} days (on ${formattedDate}). Please ensure your organisation remains compliant.`,
            actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/programme`,
            recipient: enrolment.organization.email ?? undefined,
          });

          alertsSent++;
        }

        // Build update data: set all triggered alert flags
        const updateData: Record<string, boolean | string> = {};
        for (const alert of alertsToSend) {
          updateData[alert.flag] = true;
        }

        // Transition ACTIVE to RENEWAL_DUE
        updateData.status = "RENEWAL_DUE";

        await tx.programmeEnrolment.update({
          where: { id: enrolment.id },
          data: updateData,
        });
      });
    } catch (error) {
      console.error(
        `Failed to send programme renewal alert for enrolment ${enrolment.id}:`,
        error
      );
    }
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

async function checkAuditScheduling(): Promise<number> {
  let auditsScheduled = 0;

  try {
    const orgsNeedingAudit = await getOrganizationsNeedingAudit();

    for (const org of orgsNeedingAudit) {
      try {
        const audit = await scheduleAudit(org.id);

        // Notify the org owner
        const owner = org.members[0];
        if (owner) {
          await notifyAuditScheduled({
            organizationId: org.id,
            businessName: org.name,
            auditDate: audit.scheduledDate,
            ownerEmail: owner.email,
            ownerPhone: owner.phone || undefined,
          });
        }

        auditsScheduled++;
      } catch (error) {
        console.error(
          `Failed to schedule audit for organization ${org.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Failed to check audit scheduling:", error);
  }

  return auditsScheduled;
}

async function checkAuditReminders(): Promise<number> {
  const now = new Date();
  let remindersSent = 0;

  // Find SCHEDULED audits within 30 days that haven't had a reminder sent
  // Check for existing AUDIT_REMINDER notifications to avoid duplicates
  const upcomingAudits = await db.audit.findMany({
    where: {
      status: "SCHEDULED",
      scheduledDate: {
        gte: now,
        lte: new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      organization: {
        include: {
          members: {
            where: { role: "OWNER" },
            select: { email: true, phone: true, clerkUserId: true },
          },
        },
      },
    },
  });

  for (const audit of upcomingAudits) {
    const owner = audit.organization.members[0];
    if (!owner) continue;

    // Check if we already sent a reminder for this audit
    const existingReminder = await db.notification.findFirst({
      where: {
        organizationId: audit.organizationId,
        type: "AUDIT_REMINDER",
        message: { contains: audit.auditNumber },
      },
    });

    if (existingReminder) continue;

    const daysUntilAudit = Math.ceil(
      (audit.scheduledDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    try {
      await createNotification({
        organizationId: audit.organizationId,
        userId: owner.clerkUserId,
        type: "AUDIT_REMINDER",
        channel: "EMAIL",
        priority: "NORMAL",
        title: `Audit Reminder - ${daysUntilAudit} Days Away`,
        message: `Your audit (${audit.auditNumber}) is scheduled for ${audit.scheduledDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}. Please ensure all documentation is current and available for review.`,
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/audits`,
        recipient: owner.email,
      });

      remindersSent++;
    } catch (error) {
      console.error(
        `Failed to send audit reminder for audit ${audit.id}:`,
        error
      );
    }
  }

  return remindersSent;
}
