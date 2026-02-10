import { db } from "@/lib/db";
import { sendSMS, SMS_TEMPLATES, calculateNextRetryTime } from "@/lib/sms";
import { Resend } from "resend";
import {
  COMPLIANCE_THRESHOLDS,
  type NotificationType,
  type NotificationChannel,
  type NotificationPriority,
} from "@/types";
import type { NotificationPreference, OrganizationNotificationPreference } from "@prisma/client";

const resend = new Resend(process.env.RESEND_API_KEY);

// Map notification types to user preference fields
const NOTIFICATION_TYPE_TO_EMAIL_PREF: Record<NotificationType, keyof NotificationPreference | null> = {
  INSURANCE_EXPIRY: "emailInsurance",
  INSURANCE_EXPIRED: "emailInsurance",
  LBP_EXPIRY: null,           // Critical - always send
  LBP_STATUS_CHANGE: null,    // Critical - always send
  AUDIT_SCHEDULED: "emailAudit",
  AUDIT_REMINDER: "emailAudit",
  AUDIT_COMPLETED: "emailAudit",
  CAPA_DUE: "emailCompliance",
  CAPA_OVERDUE: "emailCompliance",
  COMPLIANCE_ALERT: "emailCompliance",
  DOCUMENT_REVIEW_DUE: "emailCompliance",
  TESTIMONIAL_REQUEST: "emailNewsletter",
  TESTIMONIAL_RECEIVED: "emailNewsletter",
  TIER_CHANGE: null,          // System - always send
  WELCOME: null,              // System - always send
  SYSTEM: null,               // System - always send
  PROGRAMME_RENEWAL: "emailCompliance",
  PROGRAMME_STATUS_CHANGE: null, // Always send
  CREDENTIAL_EXPIRY: "emailCompliance",
  CREDENTIAL_STATUS_CHANGE: null, // Always send
};

const NOTIFICATION_TYPE_TO_SMS_PREF: Record<NotificationType, keyof NotificationPreference | null> = {
  INSURANCE_EXPIRY: "smsInsurance",
  INSURANCE_EXPIRED: "smsInsurance",
  LBP_EXPIRY: "smsCritical",     // Maps to critical but forced on
  LBP_STATUS_CHANGE: "smsCritical", // Maps to critical but forced on
  AUDIT_SCHEDULED: "smsAudit",
  AUDIT_REMINDER: "smsAudit",
  AUDIT_COMPLETED: "smsAudit",
  CAPA_DUE: "smsCritical",       // Urgent CAPA is critical
  CAPA_OVERDUE: "smsCritical",   // Overdue CAPA is critical
  COMPLIANCE_ALERT: "smsCritical", // Compliance alerts are critical
  DOCUMENT_REVIEW_DUE: null,     // No SMS for document review
  TESTIMONIAL_REQUEST: null,     // No SMS for testimonials
  TESTIMONIAL_RECEIVED: null,    // No SMS for testimonials
  TIER_CHANGE: "smsCritical",    // Tier changes are important
  WELCOME: null,                 // No SMS for welcome
  SYSTEM: "smsCritical",         // System alerts are critical
  PROGRAMME_RENEWAL: "smsCritical",
  PROGRAMME_STATUS_CHANGE: "smsCritical",
  CREDENTIAL_EXPIRY: "smsCritical",
  CREDENTIAL_STATUS_CHANGE: "smsCritical",
};

// Map notification types to organization preference fields
const NOTIFICATION_TYPE_TO_ORG_EMAIL_PREF: Record<NotificationType, keyof OrganizationNotificationPreference | null> = {
  INSURANCE_EXPIRY: "emailInsuranceAlerts",
  INSURANCE_EXPIRED: "emailInsuranceAlerts",
  LBP_EXPIRY: null,              // Critical - always send
  LBP_STATUS_CHANGE: null,       // Critical - always send
  AUDIT_SCHEDULED: "emailAuditAlerts",
  AUDIT_REMINDER: "emailAuditAlerts",
  AUDIT_COMPLETED: "emailAuditAlerts",
  CAPA_DUE: "emailComplianceAlerts",
  CAPA_OVERDUE: "emailComplianceAlerts",
  COMPLIANCE_ALERT: "emailComplianceAlerts",
  DOCUMENT_REVIEW_DUE: "emailComplianceAlerts",
  TESTIMONIAL_REQUEST: "emailSystemAlerts",
  TESTIMONIAL_RECEIVED: "emailSystemAlerts",
  TIER_CHANGE: "emailSystemAlerts",
  WELCOME: "emailSystemAlerts",
  SYSTEM: "emailSystemAlerts",
  PROGRAMME_RENEWAL: "emailComplianceAlerts",
  PROGRAMME_STATUS_CHANGE: "emailSystemAlerts",
  CREDENTIAL_EXPIRY: "emailComplianceAlerts",
  CREDENTIAL_STATUS_CHANGE: "emailSystemAlerts",
};

const NOTIFICATION_TYPE_TO_ORG_SMS_PREF: Record<NotificationType, keyof OrganizationNotificationPreference | null> = {
  INSURANCE_EXPIRY: "smsInsuranceAlerts",
  INSURANCE_EXPIRED: "smsInsuranceAlerts",
  LBP_EXPIRY: "smsCriticalAlerts",
  LBP_STATUS_CHANGE: "smsCriticalAlerts",
  AUDIT_SCHEDULED: "smsAuditAlerts",
  AUDIT_REMINDER: "smsAuditAlerts",
  AUDIT_COMPLETED: "smsAuditAlerts",
  CAPA_DUE: "smsCriticalAlerts",
  CAPA_OVERDUE: "smsCriticalAlerts",
  COMPLIANCE_ALERT: "smsCriticalAlerts",
  DOCUMENT_REVIEW_DUE: null,
  TESTIMONIAL_REQUEST: null,
  TESTIMONIAL_RECEIVED: null,
  TIER_CHANGE: "smsCriticalAlerts",
  WELCOME: null,
  SYSTEM: "smsCriticalAlerts",
  PROGRAMME_RENEWAL: "smsInsuranceAlerts",
  PROGRAMME_STATUS_CHANGE: "smsCriticalAlerts",
  CREDENTIAL_EXPIRY: "smsInsuranceAlerts",
  CREDENTIAL_STATUS_CHANGE: "smsCriticalAlerts",
};

/**
 * Check if a notification should be sent based on two-tier preference hierarchy:
 * 1. Critical notifications (LBP status changes, smsCritical) always send
 * 2. Organization must have the notification type enabled
 * 3. User must have opted in (or not opted out)
 *
 * Returns: { shouldSend: boolean, reason?: string }
 */
async function shouldSendNotification(params: {
  organizationId?: string;
  userId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
}): Promise<{ shouldSend: boolean; reason?: string }> {
  const { organizationId, userId, type, channel, priority } = params;

  // IN_APP and PUSH notifications always allowed (no opt-out)
  if (channel === "IN_APP" || channel === "PUSH") {
    return { shouldSend: true };
  }

  // CRITICAL priority notifications always send (security trumps preferences)
  if (priority === "CRITICAL") {
    return { shouldSend: true };
  }

  // Check if this notification type is critical (null mapping = always send)
  const emailPrefKey = NOTIFICATION_TYPE_TO_EMAIL_PREF[type];
  const smsPrefKey = NOTIFICATION_TYPE_TO_SMS_PREF[type];

  if (channel === "EMAIL" && emailPrefKey === null) {
    return { shouldSend: true }; // Critical email, always send
  }
  if (channel === "SMS" && smsPrefKey === null) {
    return { shouldSend: true }; // Critical SMS, always send
  }

  // SMS critical (smsCritical) is forced on - always send regardless of user preference
  if (channel === "SMS" && smsPrefKey === "smsCritical") {
    return { shouldSend: true };
  }

  // Step 2: Check organization preferences (if organizationId provided)
  if (organizationId) {
    const orgPrefs = await db.organizationNotificationPreference.findUnique({
      where: { organizationId },
    });

    if (orgPrefs) {
      // Check master channel enable
      if (channel === "EMAIL" && !orgPrefs.emailEnabled) {
        return { shouldSend: false, reason: "Organization has email notifications disabled" };
      }
      if (channel === "SMS" && !orgPrefs.smsEnabled) {
        return { shouldSend: false, reason: "Organization has SMS notifications disabled" };
      }

      // Check specific notification type for org
      const orgEmailPrefKey = NOTIFICATION_TYPE_TO_ORG_EMAIL_PREF[type];
      const orgSmsPrefKey = NOTIFICATION_TYPE_TO_ORG_SMS_PREF[type];

      if (channel === "EMAIL" && orgEmailPrefKey && !orgPrefs[orgEmailPrefKey]) {
        return { shouldSend: false, reason: `Organization has ${type} email notifications disabled` };
      }
      if (channel === "SMS" && orgSmsPrefKey && !orgPrefs[orgSmsPrefKey]) {
        return { shouldSend: false, reason: `Organization has ${type} SMS notifications disabled` };
      }
    }
    // If no org prefs record, default to allowing (org hasn't configured preferences)
  }

  // Step 3: Check user preferences (if userId provided)
  if (userId) {
    const userPrefs = await db.notificationPreference.findUnique({
      where: { userId },
    });

    if (userPrefs) {
      // Check master channel enable
      if (channel === "EMAIL" && !userPrefs.emailEnabled) {
        return { shouldSend: false, reason: "User has email notifications disabled" };
      }
      if (channel === "SMS" && !userPrefs.smsEnabled) {
        return { shouldSend: false, reason: "User has SMS notifications disabled" };
      }

      // Check specific notification type for user
      if (channel === "EMAIL" && emailPrefKey) {
        const prefValue = userPrefs[emailPrefKey as keyof NotificationPreference];
        if (prefValue === false) {
          return { shouldSend: false, reason: `User has opted out of ${type} email notifications` };
        }
      }
      if (channel === "SMS" && smsPrefKey && smsPrefKey !== "smsCritical") {
        const prefValue = userPrefs[smsPrefKey as keyof NotificationPreference];
        if (prefValue === false) {
          return { shouldSend: false, reason: `User has opted out of ${type} SMS notifications` };
        }
      }
    }
    // If no user prefs record, default to allowing (user hasn't configured preferences)
  }

  return { shouldSend: true };
}

interface CreateNotificationParams {
  organizationId?: string;
  userId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  recipient?: string; // Email or phone number
  scheduledFor?: Date;
}

interface SendResult {
  success: boolean;
  notificationId: string;
  externalId?: string;
  error?: string;
  skipped?: boolean;    // NEW: true if notification was skipped due to preferences
  reason?: string;      // NEW: reason for skip
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<SendResult> {
  const {
    organizationId,
    userId,
    type,
    channel,
    priority = "NORMAL",
    title,
    message,
    actionUrl,
    recipient,
    scheduledFor,
  } = params;

  // Check if notification should be sent based on preferences
  const prefCheck = await shouldSendNotification({
    organizationId,
    userId,
    type,
    channel,
    priority,
  });

  if (!prefCheck.shouldSend) {
    // Log why notification was skipped (useful for debugging)
    console.log(`[Notification] Skipped ${type} via ${channel}: ${prefCheck.reason}`);

    // Return a "skipped" result without creating a record
    return {
      success: true,
      notificationId: "", // Empty ID indicates skipped
      skipped: true,
      reason: prefCheck.reason,
    };
  }

  // Create the notification record
  const notification = await db.notification.create({
    data: {
      organizationId,
      userId,
      type,
      channel,
      priority,
      title,
      message,
      actionUrl,
      recipient,
      scheduledFor,
      status: scheduledFor ? "PENDING" : "QUEUED",
    },
  });

  // If scheduled for later, don't send now
  if (scheduledFor && scheduledFor > new Date()) {
    return {
      success: true,
      notificationId: notification.id,
    };
  }

  // Send immediately based on channel
  return sendNotification(notification.id);
}

export async function sendNotification(notificationId: string): Promise<SendResult> {
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return {
      success: false,
      notificationId,
      error: "Notification not found",
    };
  }

  try {
    let externalId: string | undefined;

    switch (notification.channel) {
      case "EMAIL":
        externalId = await sendEmailNotification(notification);
        break;
      case "SMS":
        externalId = await sendSMSNotification(notification);
        break;
      case "IN_APP":
        // In-app notifications are already created, just mark as delivered
        externalId = notification.id;
        break;
      case "PUSH":
        // Push notifications would integrate with a service like Firebase
        console.log("Push notifications not yet implemented");
        externalId = undefined;
        break;
    }

    // Update notification as sent
    await db.notification.update({
      where: { id: notificationId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        externalId,
      },
    });

    return {
      success: true,
      notificationId,
      externalId,
    };
  } catch (error) {
    // Update notification as failed
    await db.notification.update({
      where: { id: notificationId },
      data: {
        status: "FAILED",
        failureReason: error instanceof Error ? error.message : "Unknown error",
        retryCount: { increment: 1 },
      },
    });

    return {
      success: false,
      notificationId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function sendEmailNotification(notification: {
  recipient: string | null;
  title: string;
  message: string;
  actionUrl: string | null;
}): Promise<string | undefined> {
  if (!notification.recipient) {
    throw new Error("No email recipient specified");
  }

  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM || "RANZ Portal <noreply@ranz.org.nz>",
    to: notification.recipient,
    subject: notification.title,
    html: generateEmailHtml(notification),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data?.id;
}

async function sendSMSNotification(notification: {
  recipient: string | null;
  message: string;
}): Promise<string | undefined> {
  if (!notification.recipient) {
    throw new Error("No phone number specified");
  }

  const result = await sendSMS(notification.recipient, notification.message);

  if (!result.success) {
    throw new Error(result.error || "SMS send failed");
  }

  return result.messageId;
}

function generateEmailHtml(notification: {
  title: string;
  message: string;
  actionUrl: string | null;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notification.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <div style="display: flex; align-items: center; margin-bottom: 16px;">
      <div style="background: #2563eb; color: white; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; margin-right: 12px;">R</div>
      <span style="font-size: 18px; font-weight: 600; color: #0f172a;">RANZ Portal</span>
    </div>
    <h1 style="color: #0f172a; font-size: 20px; margin: 0 0 12px 0;">${notification.title}</h1>
    <p style="color: #475569; margin: 0 0 20px 0; white-space: pre-wrap;">${notification.message}</p>
    ${
      notification.actionUrl
        ? `<a href="${notification.actionUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View Details</a>`
        : ""
    }
  </div>
  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
    This email was sent by the RANZ Certified Business Portal.<br>
    <a href="https://portal.ranz.org.nz/settings/notifications" style="color: #64748b;">Manage notification preferences</a>
  </p>
</body>
</html>
  `.trim();
}

// Convenience functions for common notification types
export async function notifyInsuranceExpiry(params: {
  organizationId: string;
  businessName: string;
  policyType: string;
  daysUntilExpiry: number;
  ownerEmail: string;
  ownerPhone?: string;
  ownerUserId?: string;  // NEW: Links notification to specific user
}): Promise<void> {
  const {
    organizationId,
    businessName,
    policyType,
    daysUntilExpiry,
    ownerEmail,
    ownerPhone,
    ownerUserId,
  } = params;

  const priority: NotificationPriority =
    daysUntilExpiry <= 30 ? "HIGH" : "NORMAL";

  // Send email
  await createNotification({
    organizationId,
    userId: ownerUserId,  // NEW: Link to owner user
    type: "INSURANCE_EXPIRY",
    channel: "EMAIL",
    priority,
    title: `Insurance Expiry Warning - ${policyType}`,
    message: `Your ${policyType} insurance expires in ${daysUntilExpiry} days. Please renew to maintain your RANZ certification status.`,
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/insurance`,
    recipient: ownerEmail,
  });

  // Send SMS if phone provided and critical
  if (ownerPhone && daysUntilExpiry <= 30) {
    const smsMessage =
      daysUntilExpiry <= 30
        ? SMS_TEMPLATES.insuranceExpiry30(
            businessName,
            policyType,
            daysUntilExpiry
          )
        : SMS_TEMPLATES.insuranceExpiry90(
            businessName,
            policyType,
            daysUntilExpiry
          );

    await createNotification({
      organizationId,
      userId: ownerUserId,  // NEW: Link to owner user
      type: "INSURANCE_EXPIRY",
      channel: "SMS",
      priority,
      title: "Insurance Expiry",
      message: smsMessage,
      recipient: ownerPhone,
    });
  }
}

export async function notifyAuditScheduled(params: {
  organizationId: string;
  businessName: string;
  auditDate: Date;
  ownerEmail: string;
  ownerPhone?: string;
}): Promise<void> {
  const { organizationId, businessName, auditDate, ownerEmail, ownerPhone } =
    params;

  const formattedDate = auditDate.toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await createNotification({
    organizationId,
    type: "AUDIT_SCHEDULED",
    channel: "EMAIL",
    priority: "NORMAL",
    title: "Audit Scheduled",
    message: `An audit has been scheduled for ${businessName} on ${formattedDate}. Please ensure all documentation is up to date and available for review.`,
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/audits`,
    recipient: ownerEmail,
  });

  if (ownerPhone) {
    await createNotification({
      organizationId,
      type: "AUDIT_SCHEDULED",
      channel: "SMS",
      priority: "NORMAL",
      title: "Audit Scheduled",
      message: SMS_TEMPLATES.auditScheduled(businessName, formattedDate),
      recipient: ownerPhone,
    });
  }
}

export async function notifyCapaOverdue(params: {
  organizationId: string;
  capaTitle: string;
  assigneeEmail: string;
  assigneePhone?: string;
}): Promise<void> {
  const { organizationId, capaTitle, assigneeEmail, assigneePhone } = params;

  await createNotification({
    organizationId,
    type: "CAPA_OVERDUE",
    channel: "EMAIL",
    priority: "HIGH",
    title: "CAPA Overdue - Immediate Action Required",
    message: `The corrective action "${capaTitle}" is now overdue. Please complete this action immediately to avoid compliance issues.`,
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/capa`,
    recipient: assigneeEmail,
  });

  if (assigneePhone) {
    await createNotification({
      organizationId,
      type: "CAPA_OVERDUE",
      channel: "SMS",
      priority: "HIGH",
      title: "CAPA Overdue",
      message: SMS_TEMPLATES.capaOverdue(capaTitle),
      recipient: assigneePhone,
    });
  }
}

export async function notifyComplianceAlert(params: {
  organizationId: string;
  businessName: string;
  complianceScore: number;
  ownerEmail: string;
  ownerPhone?: string;
}): Promise<void> {
  const {
    organizationId,
    businessName,
    complianceScore,
    ownerEmail,
    ownerPhone,
  } = params;

  const priority: NotificationPriority =
    complianceScore < COMPLIANCE_THRESHOLDS.AT_RISK ? "CRITICAL" : "HIGH";

  await createNotification({
    organizationId,
    type: "COMPLIANCE_ALERT",
    channel: "EMAIL",
    priority,
    title: "Compliance Score Alert",
    message: `Your compliance score has dropped to ${complianceScore}%. Please review your dashboard to identify and address outstanding items.`,
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    recipient: ownerEmail,
  });

  if (ownerPhone && complianceScore < COMPLIANCE_THRESHOLDS.AT_RISK) {
    await createNotification({
      organizationId,
      type: "COMPLIANCE_ALERT",
      channel: "SMS",
      priority,
      title: "Compliance Alert",
      message: SMS_TEMPLATES.complianceAlert(businessName, complianceScore),
      recipient: ownerPhone,
    });
  }
}

// Process scheduled notifications (called by cron)
export async function processScheduledNotifications(): Promise<number> {
  const pendingNotifications = await db.notification.findMany({
    where: {
      status: "PENDING",
      scheduledFor: {
        lte: new Date(),
      },
    },
    take: 100, // Process in batches
  });

  let sentCount = 0;
  for (const notification of pendingNotifications) {
    const result = await sendNotification(notification.id);
    if (result.success) sentCount++;
  }

  return sentCount;
}

// Retry failed notifications with exponential backoff (called by cron)
export async function retryFailedNotifications(): Promise<number> {
  const now = new Date();

  const failedNotifications = await db.notification.findMany({
    where: {
      status: "FAILED",
      retryCount: { lt: 3 }, // Max 3 retries
      OR: [
        { nextRetryAt: null },        // Never scheduled (legacy records)
        { nextRetryAt: { lte: now } } // Retry time has been reached
      ]
    },
    take: 50,
  });

  let sentCount = 0;
  for (const notification of failedNotifications) {
    // Update lastRetryAt before attempt
    await db.notification.update({
      where: { id: notification.id },
      data: { lastRetryAt: now }
    });

    const result = await sendNotification(notification.id);

    if (result.success) {
      sentCount++;
    } else {
      // Calculate and schedule next retry if under limit
      const newRetryCount = notification.retryCount + 1;
      if (newRetryCount < 3) {
        const nextRetry = calculateNextRetryTime(newRetryCount, now);
        await db.notification.update({
          where: { id: notification.id },
          data: { nextRetryAt: nextRetry }
        });
      }
    }
  }

  return sentCount;
}

// Generate LBP status change message for affected member (personal notification)
export function generateMemberLBPMessage(
  memberName: string,
  lbpNumber: string,
  oldStatus: string | null,
  newStatus: string
): string {
  const statusExplanation =
    newStatus === "SUSPENDED"
      ? "You are now suspended from carrying out restricted building work. This suspension must be resolved before you can work as a Licensed Building Practitioner."
      : newStatus === "CANCELLED"
      ? "Your license has been revoked. You are no longer authorized to carry out restricted building work under this license."
      : `Your license status has changed to ${newStatus}.`;

  return `
<h2>Hi ${memberName},</h2>

<p>Your Licensed Building Practitioner status has changed:</p>

<ul>
  <li><strong>LBP Number:</strong> ${lbpNumber}</li>
  <li><strong>Previous Status:</strong> ${oldStatus || "Unknown"}</li>
  <li><strong>New Status:</strong> <span style="color: #dc2626; font-weight: 600;">${newStatus}</span></li>
</ul>

<div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0;">
  <p style="margin: 0; color: #991b1b;"><strong>What this means:</strong></p>
  <p style="margin: 8px 0 0 0; color: #991b1b;">${statusExplanation}</p>
</div>

<p>If you believe this is an error or need assistance, please contact the LBP Board immediately:</p>

<ul>
  <li><strong>Phone:</strong> 0800 729 721</li>
  <li><strong>Email:</strong> <a href="mailto:lbp@mbie.govt.nz">lbp@mbie.govt.nz</a></li>
</ul>

<p>You can view your profile in the RANZ Portal to see how this affects your employment status.</p>
  `.trim();
}

// Generate LBP status change message for organization (compliance notification)
export function generateOrgLBPMessage(
  memberName: string,
  lbpNumber: string,
  oldStatus: string | null,
  newStatus: string
): string {
  return `
<h2>Staff LBP License Status Change Detected</h2>

<p>During our daily verification with the MBIE LBP Board, we detected a status change for one of your staff members:</p>

<ul>
  <li><strong>Staff Member:</strong> ${memberName}</li>
  <li><strong>LBP Number:</strong> ${lbpNumber}</li>
  <li><strong>Previous Status:</strong> ${oldStatus || "Unknown"}</li>
  <li><strong>New Status:</strong> <span style="color: #dc2626; font-weight: 600;">${newStatus}</span></li>
</ul>

<div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0;">
  <p style="margin: 0; color: #92400e;"><strong>Compliance Impact:</strong></p>
  <p style="margin: 8px 0 0 0; color: #92400e;">
    This status change may affect your organization's certification and compliance score.
    ${newStatus === "SUSPENDED" || newStatus === "CANCELLED" ? "A suspended or cancelled LBP license means this staff member cannot carry out restricted building work." : ""}
  </p>
</div>

<p>Please review this change and take any necessary action to maintain your certification status.</p>

<p>You can view the staff member's profile in the RANZ Portal for full details.</p>
  `.trim();
}

// Get unread in-app notifications for a user
export async function getUnreadNotifications(userId: string) {
  return db.notification.findMany({
    where: {
      userId,
      channel: "IN_APP",
      readAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

// Mark notification as read
export async function markNotificationRead(notificationId: string): Promise<void> {
  await db.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

// Mark all notifications as read for a user
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
