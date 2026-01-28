import { db } from "@/lib/db";
import type { ReportType, CertificationTier } from "@/types";
import { COMPLIANCE_THRESHOLDS } from "@/types";

interface ComplianceSummaryData {
  totalMembers: number;
  byTier: Record<CertificationTier, number>;
  averageScore: number;
  scoreDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    needsAttention: number; // 50-69
    critical: number; // <50
  };
  topIssues: Array<{
    element: string;
    count: number;
    avgScore: number;
  }>;
  insuranceStatus: {
    allValid: number;
    expiringSoon: number;
    expired: number;
  };
  lbpStatus: {
    allVerified: number;
    someUnverified: number;
    noneVerified: number;
  };
}

interface MemberDirectoryData {
  members: Array<{
    id: string;
    name: string;
    tradingName: string | null;
    tier: CertificationTier;
    city: string | null;
    complianceScore: number;
    memberSince: string | null;
    staffCount: number;
    email: string | null;
    phone: string | null;
  }>;
}

interface AuditSummaryData {
  totalAudits: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byRating: Record<string, number>;
  averageFindings: {
    major: number;
    minor: number;
    observations: number;
  };
  monthlyTrend: Array<{
    month: string;
    count: number;
    passRate: number;
  }>;
}

export async function generateReport(
  reportType: ReportType,
  options?: {
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
    tier?: CertificationTier;
  }
): Promise<unknown> {
  switch (reportType) {
    case "COMPLIANCE_SUMMARY":
      return generateComplianceSummary(options);
    case "MEMBER_DIRECTORY":
      return generateMemberDirectory(options);
    case "AUDIT_SUMMARY":
      return generateAuditSummary(options);
    case "INSURANCE_STATUS":
      return generateInsuranceStatus(options);
    case "LBP_STATUS":
      return generateLBPStatus(options);
    case "CAPA_SUMMARY":
      return generateCAPASummary(options);
    case "PROJECT_PORTFOLIO":
      return generateProjectPortfolio(options);
    case "TIER_ANALYSIS":
      return generateTierAnalysis(options);
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

async function generateComplianceSummary(options?: {
  tier?: CertificationTier;
}): Promise<ComplianceSummaryData> {
  const where = options?.tier ? { certificationTier: options.tier } : {};

  const organizations = await db.organization.findMany({
    where,
    include: {
      members: { select: { lbpVerified: true } },
      insurancePolicies: {
        where: {
          policyType: { in: ["PUBLIC_LIABILITY", "PROFESSIONAL_INDEMNITY"] },
        },
        select: { expiryDate: true },
      },
      assessments: {
        select: { isoElement: true, score: true, status: true },
      },
    },
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Calculate tier distribution
  const byTier: Record<CertificationTier, number> = {
    ACCREDITED: 0,
    CERTIFIED: 0,
    MASTER_ROOFER: 0,
  };

  // Score distribution
  const scoreDistribution = {
    excellent: 0,
    good: 0,
    needsAttention: 0,
    critical: 0,
  };

  // Insurance status
  const insuranceStatus = {
    allValid: 0,
    expiringSoon: 0,
    expired: 0,
  };

  // LBP status
  const lbpStatus = {
    allVerified: 0,
    someUnverified: 0,
    noneVerified: 0,
  };

  // Element issues
  const elementScores: Record<string, { total: number; count: number }> = {};

  let totalScore = 0;

  for (const org of organizations) {
    byTier[org.certificationTier]++;
    totalScore += org.complianceScore;

    // Score distribution
    if (org.complianceScore >= COMPLIANCE_THRESHOLDS.COMPLIANT) scoreDistribution.excellent++;
    else if (org.complianceScore >= COMPLIANCE_THRESHOLDS.AT_RISK) scoreDistribution.good++;
    else if (org.complianceScore >= 50) scoreDistribution.needsAttention++;
    else scoreDistribution.critical++;

    // Insurance status
    const validPolicies = org.insurancePolicies.filter(
      (p) => p.expiryDate > now
    );
    const expiringPolicies = org.insurancePolicies.filter(
      (p) => p.expiryDate > now && p.expiryDate <= thirtyDaysFromNow
    );

    if (validPolicies.length >= 2 && expiringPolicies.length === 0) {
      insuranceStatus.allValid++;
    } else if (expiringPolicies.length > 0) {
      insuranceStatus.expiringSoon++;
    } else {
      insuranceStatus.expired++;
    }

    // LBP status
    const totalMembers = org.members.length;
    const verifiedMembers = org.members.filter((m) => m.lbpVerified).length;
    if (totalMembers === 0 || verifiedMembers === totalMembers) {
      lbpStatus.allVerified++;
    } else if (verifiedMembers > 0) {
      lbpStatus.someUnverified++;
    } else {
      lbpStatus.noneVerified++;
    }

    // Element scores
    for (const assessment of org.assessments) {
      if (!elementScores[assessment.isoElement]) {
        elementScores[assessment.isoElement] = { total: 0, count: 0 };
      }
      elementScores[assessment.isoElement].total += assessment.score;
      elementScores[assessment.isoElement].count++;
    }
  }

  // Top issues (lowest scoring elements)
  const topIssues = Object.entries(elementScores)
    .map(([element, data]) => ({
      element,
      count: data.count,
      avgScore: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);

  return {
    totalMembers: organizations.length,
    byTier,
    averageScore:
      organizations.length > 0 ? totalScore / organizations.length : 0,
    scoreDistribution,
    topIssues,
    insuranceStatus,
    lbpStatus,
  };
}

async function generateMemberDirectory(options?: {
  tier?: CertificationTier;
}): Promise<MemberDirectoryData> {
  const where = options?.tier ? { certificationTier: options.tier } : {};

  const organizations = await db.organization.findMany({
    where,
    include: {
      members: {
        where: { role: "OWNER" },
        select: { email: true, phone: true },
      },
      _count: { select: { members: true } },
    },
    orderBy: [{ certificationTier: "desc" }, { name: "asc" }],
  });

  return {
    members: organizations.map((org) => ({
      id: org.id,
      name: org.name,
      tradingName: org.tradingName,
      tier: org.certificationTier,
      city: org.city,
      complianceScore: org.complianceScore,
      memberSince: org.certifiedSince?.toISOString().split("T")[0] || null,
      staffCount: org._count.members,
      email: org.members[0]?.email || org.email,
      phone: org.members[0]?.phone || org.phone,
    })),
  };
}

async function generateAuditSummary(options?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<AuditSummaryData> {
  const where: Record<string, unknown> = {};
  if (options?.startDate || options?.endDate) {
    where.scheduledDate = {};
    if (options.startDate)
      (where.scheduledDate as Record<string, Date>).gte = options.startDate;
    if (options.endDate)
      (where.scheduledDate as Record<string, Date>).lte = options.endDate;
  }

  const audits = await db.audit.findMany({
    where,
    select: {
      status: true,
      auditType: true,
      rating: true,
      majorNonconformities: true,
      minorNonconformities: true,
      observations: true,
      scheduledDate: true,
      completedAt: true,
    },
  });

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byRating: Record<string, number> = {};
  let totalMajor = 0;
  let totalMinor = 0;
  let totalObservations = 0;
  let completedCount = 0;

  // Monthly trend
  const monthlyData: Record<string, { count: number; passed: number }> = {};

  for (const audit of audits) {
    byStatus[audit.status] = (byStatus[audit.status] || 0) + 1;
    byType[audit.auditType] = (byType[audit.auditType] || 0) + 1;

    if (audit.rating) {
      byRating[audit.rating] = (byRating[audit.rating] || 0) + 1;
    }

    if (audit.status === "COMPLETED") {
      completedCount++;
      totalMajor += audit.majorNonconformities;
      totalMinor += audit.minorNonconformities;
      totalObservations += audit.observations;
    }

    // Monthly trend
    const month = audit.scheduledDate.toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { count: 0, passed: 0 };
    }
    monthlyData[month].count++;
    if (
      audit.rating === "PASS" ||
      audit.rating === "PASS_WITH_OBSERVATIONS"
    ) {
      monthlyData[month].passed++;
    }
  }

  const monthlyTrend = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // Last 12 months
    .map(([month, data]) => ({
      month,
      count: data.count,
      passRate: data.count > 0 ? (data.passed / data.count) * 100 : 0,
    }));

  return {
    totalAudits: audits.length,
    byStatus,
    byType,
    byRating,
    averageFindings: {
      major: completedCount > 0 ? totalMajor / completedCount : 0,
      minor: completedCount > 0 ? totalMinor / completedCount : 0,
      observations: completedCount > 0 ? totalObservations / completedCount : 0,
    },
    monthlyTrend,
  };
}

async function generateInsuranceStatus(options?: {
  tier?: CertificationTier;
}) {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const where = options?.tier
    ? { organization: { certificationTier: options.tier } }
    : {};

  const policies = await db.insurancePolicy.findMany({
    where,
    include: {
      organization: {
        select: { id: true, name: true, certificationTier: true },
      },
    },
  });

  const summary = {
    total: policies.length,
    expired: policies.filter((p) => p.expiryDate < now).length,
    expiring30Days: policies.filter(
      (p) => p.expiryDate >= now && p.expiryDate <= thirtyDays
    ).length,
    expiring60Days: policies.filter(
      (p) => p.expiryDate > thirtyDays && p.expiryDate <= sixtyDays
    ).length,
    expiring90Days: policies.filter(
      (p) => p.expiryDate > sixtyDays && p.expiryDate <= ninetyDays
    ).length,
    current: policies.filter((p) => p.expiryDate > ninetyDays).length,
  };

  const byType = policies.reduce(
    (acc, p) => {
      acc[p.policyType] = (acc[p.policyType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const expiringPolicies = policies
    .filter((p) => p.expiryDate >= now && p.expiryDate <= ninetyDays)
    .map((p) => ({
      organizationId: p.organization.id,
      organizationName: p.organization.name,
      policyType: p.policyType,
      expiryDate: p.expiryDate.toISOString().split("T")[0],
      daysUntilExpiry: Math.ceil(
        (p.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      ),
    }))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  return { summary, byType, expiringPolicies };
}

async function generateLBPStatus(options?: { tier?: CertificationTier }) {
  const where = options?.tier
    ? { organization: { certificationTier: options.tier } }
    : {};

  const members = await db.organizationMember.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      lbpNumber: true,
      lbpClass: true,
      lbpVerified: true,
      lbpStatus: true,
      lbpExpiry: true,
      lbpLastChecked: true,
      organization: {
        select: { id: true, name: true },
      },
    },
  });

  const summary = {
    total: members.length,
    withLBP: members.filter((m) => m.lbpNumber).length,
    verified: members.filter((m) => m.lbpVerified).length,
    current: members.filter((m) => m.lbpStatus === "CURRENT").length,
    suspended: members.filter((m) => m.lbpStatus === "SUSPENDED").length,
    cancelled: members.filter((m) => m.lbpStatus === "CANCELLED").length,
    expired: members.filter((m) => m.lbpStatus === "EXPIRED").length,
    notFound: members.filter((m) => m.lbpStatus === "NOT_FOUND").length,
  };

  const issues = members
    .filter(
      (m) =>
        m.lbpNumber &&
        m.lbpStatus &&
        !["CURRENT"].includes(m.lbpStatus)
    )
    .map((m) => ({
      organizationId: m.organization.id,
      organizationName: m.organization.name,
      memberName: `${m.firstName} ${m.lastName}`,
      lbpNumber: m.lbpNumber,
      status: m.lbpStatus,
      lastChecked: m.lbpLastChecked?.toISOString().split("T")[0] || null,
    }));

  return { summary, issues };
}

async function generateCAPASummary(options?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const where: Record<string, unknown> = {};
  if (options?.startDate || options?.endDate) {
    where.identifiedDate = {};
    if (options.startDate)
      (where.identifiedDate as Record<string, Date>).gte = options.startDate;
    if (options.endDate)
      (where.identifiedDate as Record<string, Date>).lte = options.endDate;
  }

  const capas = await db.cAPARecord.findMany({
    where,
    include: {
      organization: { select: { name: true } },
    },
  });

  const byStatus = capas.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const bySeverity = capas.reduce(
    (acc, c) => {
      acc[c.severity] = (acc[c.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const bySource = capas.reduce(
    (acc, c) => {
      acc[c.sourceType] = (acc[c.sourceType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate average resolution time for closed CAPAs
  const closedCAPAs = capas.filter((c) => c.status === "CLOSED" && c.closedDate);
  const avgResolutionDays =
    closedCAPAs.length > 0
      ? closedCAPAs.reduce((sum, c) => {
          const days = Math.ceil(
            (c.closedDate!.getTime() - c.identifiedDate.getTime()) /
              (24 * 60 * 60 * 1000)
          );
          return sum + days;
        }, 0) / closedCAPAs.length
      : 0;

  const overdueCAPAs = capas
    .filter((c) => c.status === "OVERDUE" || (c.dueDate < new Date() && c.status !== "CLOSED"))
    .map((c) => ({
      id: c.id,
      capaNumber: c.capaNumber,
      title: c.title,
      organizationName: c.organization.name,
      severity: c.severity,
      dueDate: c.dueDate.toISOString().split("T")[0],
      daysOverdue: Math.ceil(
        (new Date().getTime() - c.dueDate.getTime()) / (24 * 60 * 60 * 1000)
      ),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    total: capas.length,
    byStatus,
    bySeverity,
    bySource,
    avgResolutionDays: Math.round(avgResolutionDays),
    overdueCAPAs,
  };
}

async function generateProjectPortfolio(options?: {
  organizationId?: string;
}) {
  const where = options?.organizationId
    ? { organizationId: options.organizationId }
    : {};

  const projects = await db.project.findMany({
    where,
    include: {
      organization: { select: { name: true } },
      _count: { select: { photos: true, documents: true } },
      testimonial: { select: { rating: true, verified: true } },
    },
    orderBy: { completionDate: "desc" },
    take: 100,
  });

  const byType = projects.reduce(
    (acc, p) => {
      acc[p.projectType] = (acc[p.projectType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byStatus = projects.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const completedProjects = projects.filter((p) => p.status === "COMPLETED");
  const zeroLeakRate =
    completedProjects.length > 0
      ? (completedProjects.filter((p) => p.zeroLeaks).length /
          completedProjects.length) *
        100
      : 100;

  const ratedProjects = projects.filter((p) => p.rating !== null);
  const avgRating =
    ratedProjects.length > 0
      ? ratedProjects.reduce((sum, p) => sum + p.rating!, 0) / ratedProjects.length
      : null;

  return {
    total: projects.length,
    byType,
    byStatus,
    zeroLeakRate,
    avgRating,
    projects: projects.map((p) => ({
      id: p.id,
      projectNumber: p.projectNumber,
      organizationName: p.organization.name,
      type: p.projectType,
      status: p.status,
      city: p.city,
      completionDate: p.completionDate?.toISOString().split("T")[0] || null,
      rating: p.rating,
      photoCount: p._count.photos,
      hasTestimonial: !!p.testimonial?.verified,
    })),
  };
}

async function generateTierAnalysis(options?: { tier?: CertificationTier }) {
  const tiers: CertificationTier[] = options?.tier
    ? [options.tier]
    : ["ACCREDITED", "CERTIFIED", "MASTER_ROOFER"];

  const analysis = await Promise.all(
    tiers.map(async (tier) => {
      const orgs = await db.organization.findMany({
        where: { certificationTier: tier },
        include: {
          _count: { select: { members: true, documents: true } },
          assessments: { select: { score: true } },
          audits: {
            where: { status: "COMPLETED" },
            select: { rating: true },
            take: 1,
            orderBy: { completedAt: "desc" },
          },
        },
      });

      const avgCompliance =
        orgs.length > 0
          ? orgs.reduce((sum, o) => sum + o.complianceScore, 0) / orgs.length
          : 0;

      const avgStaff =
        orgs.length > 0
          ? orgs.reduce((sum, o) => sum + o._count.members, 0) / orgs.length
          : 0;

      const avgDocs =
        orgs.length > 0
          ? orgs.reduce((sum, o) => sum + o._count.documents, 0) / orgs.length
          : 0;

      const passRate = orgs.filter(
        (o) =>
          o.audits[0]?.rating === "PASS" ||
          o.audits[0]?.rating === "PASS_WITH_OBSERVATIONS"
      ).length;

      return {
        tier,
        count: orgs.length,
        avgComplianceScore: Math.round(avgCompliance * 10) / 10,
        avgStaffCount: Math.round(avgStaff * 10) / 10,
        avgDocumentCount: Math.round(avgDocs * 10) / 10,
        auditPassRate:
          orgs.length > 0 ? Math.round((passRate / orgs.length) * 100) : 0,
      };
    })
  );

  return { tiers: analysis };
}
