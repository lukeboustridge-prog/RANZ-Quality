import { db } from "@/lib/db";
import type { CertificationTier } from "@prisma/client";
import { ALL_ISO_ELEMENTS } from "@/types";

/**
 * Tier-based audit frequency in months.
 * ACCREDITED: every 24 months
 * CERTIFIED / MASTER_ROOFER: every 12 months
 */
export function getAuditFrequencyMonths(tier: CertificationTier): number {
  switch (tier) {
    case "ACCREDITED":
      return 24;
    case "CERTIFIED":
    case "MASTER_ROOFER":
      return 12;
    default:
      return 12;
  }
}

/**
 * Find organizations that need an audit scheduled.
 * An org needs an audit when:
 *  - It has no SCHEDULED or IN_PROGRESS audit, AND
 *  - Its last COMPLETED audit was > frequency months ago, OR it has no completed audits
 */
export async function getOrganizationsNeedingAudit() {
  const now = new Date();

  // Get all organizations with their latest completed audit
  const orgs = await db.organization.findMany({
    include: {
      audits: {
        where: {
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        },
        select: { id: true },
      },
      members: {
        where: { role: "OWNER" },
        select: { email: true, phone: true, clerkUserId: true },
      },
    },
  });

  const needingAudit: typeof orgs = [];

  for (const org of orgs) {
    // Skip if there's already a scheduled or in-progress audit
    if (org.audits.length > 0) continue;

    // Skip if no owner to notify
    if (org.members.length === 0) continue;

    const frequencyMonths = getAuditFrequencyMonths(org.certificationTier);

    // Find the most recent completed audit
    const lastCompletedAudit = await db.audit.findFirst({
      where: {
        organizationId: org.id,
        status: "COMPLETED",
      },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });

    if (!lastCompletedAudit?.completedAt) {
      // No completed audits ever - needs initial certification
      needingAudit.push(org);
      continue;
    }

    // Check if enough time has passed since last completed audit
    const thresholdDate = new Date(lastCompletedAudit.completedAt);
    thresholdDate.setMonth(thresholdDate.getMonth() + frequencyMonths);

    if (thresholdDate <= now) {
      needingAudit.push(org);
    }
  }

  return needingAudit;
}

/**
 * Schedule an audit for an organization.
 * Creates an audit record with SCHEDULED status, 30 days from now.
 */
export async function scheduleAudit(organizationId: string) {
  // Determine audit type: INITIAL_CERTIFICATION if no completed audits, otherwise SURVEILLANCE
  const hasCompletedAudit = await db.audit.findFirst({
    where: {
      organizationId,
      status: "COMPLETED",
    },
    select: { id: true },
  });

  const auditType = hasCompletedAudit ? "SURVEILLANCE" : "INITIAL_CERTIFICATION";

  // Generate audit number
  const year = new Date().getFullYear();
  const auditCount = await db.audit.count({
    where: {
      organizationId,
      auditNumber: { startsWith: `AUD-${year}` },
    },
  });
  const auditNumber = `AUD-${year}-${String(auditCount + 1).padStart(3, "0")}`;

  // Schedule 30 days from now
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 30);

  const audit = await db.audit.create({
    data: {
      organizationId,
      auditNumber,
      auditType,
      status: "SCHEDULED",
      scheduledDate,
      isoElements: ALL_ISO_ELEMENTS,
      scope: `${auditType === "INITIAL_CERTIFICATION" ? "Initial certification" : "Surveillance"} audit - all 19 ISO elements`,
    },
  });

  // Update org's nextAuditDue
  await db.organization.update({
    where: { id: organizationId },
    data: { nextAuditDue: scheduledDate },
  });

  return audit;
}
