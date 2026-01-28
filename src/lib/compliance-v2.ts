import type {
  Organization,
  InsurancePolicy,
  OrganizationMember,
  Document,
  ComplianceAssessment,
  Audit,
  CertificationTier,
  ISOElement,
  ComplianceStatus,
} from "@prisma/client";
import {
  ALL_ISO_ELEMENTS,
  ISO_ELEMENT_WEIGHTS,
  INSURANCE_REQUIREMENTS,
  COMPLIANCE_THRESHOLDS,
  type InsurancePolicyType,
} from "@/types";
import { db } from "./db";
import { syncOrgMetadataToClerk } from "./clerk-sync";

// ============================================================================
// Types
// ============================================================================

interface OrganizationWithRelations extends Organization {
  insurancePolicies: InsurancePolicy[];
  members: OrganizationMember[];
  documents: Document[];
  assessments: ComplianceAssessment[];
  audits: Audit[];
}

export interface ComplianceBreakdown {
  documentation: {
    score: number;
    weight: number;
    elements: ElementScore[];
  };
  insurance: {
    score: number;
    weight: number;
    policies: PolicyScore[];
  };
  personnel: {
    score: number;
    weight: number;
    details: PersonnelDetails;
  };
  audit: {
    score: number;
    weight: number;
    details: AuditDetails;
  };
}

interface ElementScore {
  element: ISOElement;
  status: ComplianceStatus;
  score: number;
  weight: number;
  documentCount: number;
  hasApprovedDoc: boolean;
}

interface PolicyScore {
  type: InsurancePolicyType;
  required: boolean;
  minimumCoverage: number | null;
  actualCoverage: number | null;
  isValid: boolean;
  expiresIn: number | null; // days
  score: number;
}

interface PersonnelDetails {
  totalMembers: number;
  hasOwner: boolean;
  lbpVerifiedCount: number;
  lbpPendingCount: number;
  lbpExpiredCount: number;
}

interface AuditDetails {
  lastAuditDate: Date | null;
  lastAuditRating: string | null;
  daysSinceLastAudit: number | null;
  openCAPACount: number;
  overdueCAPACount: number;
}

export interface ComplianceResult {
  overallScore: number;
  breakdown: ComplianceBreakdown;
  issues: ComplianceIssue[];
  tierEligibility: TierEligibility;
}

export interface ComplianceIssue {
  category: "documentation" | "insurance" | "personnel" | "audit";
  severity: "critical" | "warning" | "info";
  code: string;
  message: string;
  element?: ISOElement;
  actionRequired?: string;
}

interface TierEligibility {
  currentTier: CertificationTier;
  eligibleForUpgrade: boolean;
  nextTier: CertificationTier | null;
  blockers: string[];
}

// ============================================================================
// Weight Configuration
// ============================================================================

const CATEGORY_WEIGHTS = {
  documentation: 0.5, // 50%
  insurance: 0.25, // 25%
  personnel: 0.15, // 15%
  audit: 0.1, // 10%
};

// ============================================================================
// Main Compliance Calculation
// ============================================================================

export async function calculateComplianceScore(
  organizationId: string
): Promise<ComplianceResult> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      insurancePolicies: true,
      members: true,
      documents: {
        where: { deletedAt: null },
      },
      assessments: true,
      audits: {
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const capaRecords = await db.cAPARecord.findMany({
    where: { organizationId },
  });

  const issues: ComplianceIssue[] = [];
  const now = new Date();

  // Calculate each category
  const documentationResult = calculateDocumentationScore(
    organization,
    issues
  );
  const insuranceResult = calculateInsuranceScore(organization, issues, now);
  const personnelResult = calculatePersonnelScore(organization, issues);
  const auditResult = calculateAuditScore(
    organization,
    capaRecords,
    issues,
    now
  );

  // Calculate weighted overall score
  const overallScore = Math.round(
    documentationResult.score * CATEGORY_WEIGHTS.documentation +
      insuranceResult.score * CATEGORY_WEIGHTS.insurance +
      personnelResult.score * CATEGORY_WEIGHTS.personnel +
      auditResult.score * CATEGORY_WEIGHTS.audit
  );

  // Determine tier eligibility
  const tierEligibility = calculateTierEligibility(
    organization.certificationTier,
    overallScore,
    insuranceResult,
    personnelResult,
    issues
  );

  return {
    overallScore,
    breakdown: {
      documentation: {
        score: documentationResult.score,
        weight: CATEGORY_WEIGHTS.documentation,
        elements: documentationResult.elements,
      },
      insurance: {
        score: insuranceResult.score,
        weight: CATEGORY_WEIGHTS.insurance,
        policies: insuranceResult.policies,
      },
      personnel: {
        score: personnelResult.score,
        weight: CATEGORY_WEIGHTS.personnel,
        details: personnelResult.details,
      },
      audit: {
        score: auditResult.score,
        weight: CATEGORY_WEIGHTS.audit,
        details: auditResult.details,
      },
    },
    issues,
    tierEligibility,
  };
}

// ============================================================================
// Documentation Score (50%)
// ============================================================================

function calculateDocumentationScore(
  org: OrganizationWithRelations,
  issues: ComplianceIssue[]
): { score: number; elements: ElementScore[] } {
  const elements: ElementScore[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const element of ALL_ISO_ELEMENTS) {
    const weight = ISO_ELEMENT_WEIGHTS[element];
    totalWeight += weight;

    // Find assessment for this element
    const assessment = org.assessments.find((a) => a.isoElement === element);

    // Find approved documents for this element
    const approvedDocs = org.documents.filter(
      (d) => d.isoElement === element && d.status === "APPROVED"
    );

    // Find any documents for this element
    const allDocs = org.documents.filter((d) => d.isoElement === element);

    let score = 0;
    let status: ComplianceStatus = "NOT_ASSESSED";

    if (assessment) {
      score = assessment.score;
      status = assessment.status;
    } else if (approvedDocs.length > 0) {
      // If no assessment but has approved docs, give partial credit
      score = 75;
      status = "PARTIAL";
    } else if (allDocs.length > 0) {
      // Has documents but not approved
      score = 25;
      status = "PARTIAL";
    }

    totalWeightedScore += score * weight;

    elements.push({
      element,
      status,
      score,
      weight,
      documentCount: allDocs.length,
      hasApprovedDoc: approvedDocs.length > 0,
    });

    // Generate issues for missing or incomplete elements
    if (score === 0) {
      const isCritical = weight >= 1.3; // High-weight elements are critical
      issues.push({
        category: "documentation",
        severity: isCritical ? "warning" : "info",
        code: `DOC_MISSING_${element}`,
        message: `No documents uploaded for ${formatElement(element)}`,
        element,
        actionRequired: `Upload documentation for ${formatElement(element)}`,
      });
    } else if (score < 50 && approvedDocs.length === 0) {
      issues.push({
        category: "documentation",
        severity: "info",
        code: `DOC_PENDING_${element}`,
        message: `Documents for ${formatElement(element)} require approval`,
        element,
        actionRequired: "Submit documents for approval",
      });
    }
  }

  const score = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  return {
    score: Math.round(score),
    elements,
  };
}

// ============================================================================
// Insurance Score (25%)
// ============================================================================

function calculateInsuranceScore(
  org: OrganizationWithRelations,
  issues: ComplianceIssue[],
  now: Date
): { score: number; policies: PolicyScore[] } {
  const tier = org.certificationTier;
  const requirements = INSURANCE_REQUIREMENTS[tier];
  const policies: PolicyScore[] = [];

  let totalScore = 0;
  let requiredCount = 0;

  for (const [type, minCoverage] of Object.entries(requirements)) {
    const policyType = type as InsurancePolicyType;
    const required = minCoverage !== null;

    if (required) {
      requiredCount++;
    }

    // Find valid policy
    const policy = org.insurancePolicies.find(
      (p) => p.policyType === policyType && new Date(p.expiryDate) > now
    );

    let score = 0;
    let isValid = false;
    let expiresIn: number | null = null;
    let actualCoverage: number | null = null;

    if (policy) {
      actualCoverage = Number(policy.coverageAmount);
      expiresIn = Math.ceil(
        (new Date(policy.expiryDate).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (minCoverage && actualCoverage >= minCoverage) {
        isValid = true;
        score = 100;

        // Deduct points for expiring soon
        if (expiresIn <= 30) {
          score = 70;
          issues.push({
            category: "insurance",
            severity: "warning",
            code: `INS_EXPIRING_${policyType}`,
            message: `${formatPolicyType(policyType)} expires in ${expiresIn} days`,
            actionRequired: "Renew insurance policy",
          });
        } else if (expiresIn <= 60) {
          score = 85;
          issues.push({
            category: "insurance",
            severity: "info",
            code: `INS_EXPIRING_SOON_${policyType}`,
            message: `${formatPolicyType(policyType)} expires in ${expiresIn} days`,
          });
        }
      } else if (minCoverage && actualCoverage < minCoverage) {
        score = 50;
        issues.push({
          category: "insurance",
          severity: "warning",
          code: `INS_INSUFFICIENT_${policyType}`,
          message: `${formatPolicyType(policyType)} coverage ($${actualCoverage.toLocaleString()}) below requirement ($${minCoverage.toLocaleString()})`,
          actionRequired: `Increase coverage to at least $${minCoverage.toLocaleString()}`,
        });
      }
    } else if (required) {
      issues.push({
        category: "insurance",
        severity: "critical",
        code: `INS_MISSING_${policyType}`,
        message: `Missing required ${formatPolicyType(policyType)} insurance`,
        actionRequired: `Obtain ${formatPolicyType(policyType)} insurance with minimum $${minCoverage?.toLocaleString()} coverage`,
      });
    }

    policies.push({
      type: policyType,
      required,
      minimumCoverage: minCoverage,
      actualCoverage,
      isValid,
      expiresIn,
      score: required ? score : 0,
    });

    if (required) {
      totalScore += score;
    }
  }

  return {
    score: requiredCount > 0 ? Math.round(totalScore / requiredCount) : 100,
    policies,
  };
}

// ============================================================================
// Personnel Score (15%)
// ============================================================================

function calculatePersonnelScore(
  org: OrganizationWithRelations,
  issues: ComplianceIssue[]
): { score: number; details: PersonnelDetails } {
  let score = 0;

  const hasOwner = org.members.some((m) => m.role === "OWNER");
  const membersWithLBP = org.members.filter((m) => m.lbpNumber);
  const verifiedLBP = membersWithLBP.filter((m) => m.lbpVerified);
  const expiredLBP = org.members.filter(
    (m) => m.lbpExpiry && new Date(m.lbpExpiry) < new Date()
  );
  const pendingLBP = membersWithLBP.filter(
    (m) => !m.lbpVerified && m.lbpStatus !== "CURRENT"
  );

  // Owner requirement (30 points)
  if (hasOwner) {
    score += 30;
  } else {
    issues.push({
      category: "personnel",
      severity: "warning",
      code: "PERS_NO_OWNER",
      message: "No organization owner assigned",
      actionRequired: "Assign an owner to the organization",
    });
  }

  // LBP credentials (50 points)
  if (membersWithLBP.length > 0) {
    if (verifiedLBP.length === membersWithLBP.length) {
      score += 50;
    } else if (verifiedLBP.length > 0) {
      score += 30;
      issues.push({
        category: "personnel",
        severity: "warning",
        code: "PERS_UNVERIFIED_LBP",
        message: `${pendingLBP.length} staff member(s) have unverified LBP credentials`,
        actionRequired: "Verify pending LBP credentials",
      });
    } else {
      score += 15;
      issues.push({
        category: "personnel",
        severity: "warning",
        code: "PERS_NO_VERIFIED_LBP",
        message: "No staff members have verified LBP credentials",
        actionRequired: "Verify LBP credentials for staff",
      });
    }
  } else {
    issues.push({
      category: "personnel",
      severity: "warning",
      code: "PERS_NO_LBP",
      message: "No staff members with LBP credentials",
      actionRequired: "Add staff with LBP credentials",
    });
  }

  // Expired LBP warning
  if (expiredLBP.length > 0) {
    issues.push({
      category: "personnel",
      severity: "critical",
      code: "PERS_EXPIRED_LBP",
      message: `${expiredLBP.length} staff member(s) have expired LBP licenses`,
      actionRequired: "Renew expired LBP licenses",
    });
    score -= 10; // Penalty
  }

  // Minimum staff (20 points)
  if (org.members.length >= 2) {
    score += 20;
  } else if (org.members.length === 1) {
    score += 10;
    issues.push({
      category: "personnel",
      severity: "info",
      code: "PERS_SINGLE_STAFF",
      message: "Only one staff member registered",
    });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    details: {
      totalMembers: org.members.length,
      hasOwner,
      lbpVerifiedCount: verifiedLBP.length,
      lbpPendingCount: pendingLBP.length,
      lbpExpiredCount: expiredLBP.length,
    },
  };
}

// ============================================================================
// Audit Score (10%)
// ============================================================================

function calculateAuditScore(
  org: OrganizationWithRelations,
  capaRecords: { status: string }[],
  issues: ComplianceIssue[],
  now: Date
): { score: number; details: AuditDetails } {
  let score = 100;
  const lastAudit = org.audits[0];

  let daysSinceLastAudit: number | null = null;
  let lastAuditRating: string | null = null;

  if (lastAudit?.completedAt) {
    daysSinceLastAudit = Math.floor(
      (now.getTime() - new Date(lastAudit.completedAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    lastAuditRating = lastAudit.rating;

    // Score based on audit result
    if (lastAudit.rating === "PASS") {
      score = 100;
    } else if (lastAudit.rating === "PASS_WITH_OBSERVATIONS") {
      score = 85;
    } else if (lastAudit.rating === "CONDITIONAL_PASS") {
      score = 60;
      issues.push({
        category: "audit",
        severity: "warning",
        code: "AUDIT_CONDITIONAL",
        message: "Last audit resulted in conditional pass",
        actionRequired: "Address audit findings",
      });
    } else if (lastAudit.rating === "FAIL") {
      score = 30;
      issues.push({
        category: "audit",
        severity: "critical",
        code: "AUDIT_FAILED",
        message: "Last audit failed",
        actionRequired: "Address all audit findings and schedule follow-up",
      });
    }

    // Check if audit is overdue
    if (daysSinceLastAudit > 365) {
      score -= 20;
      issues.push({
        category: "audit",
        severity: "warning",
        code: "AUDIT_OVERDUE",
        message: `No audit in ${daysSinceLastAudit} days`,
        actionRequired: "Schedule an audit",
      });
    }
  } else {
    // No audit history
    score = 50;
    issues.push({
      category: "audit",
      severity: "info",
      code: "AUDIT_NONE",
      message: "No completed audits on record",
      actionRequired: "Complete initial certification audit",
    });
  }

  // CAPA deductions
  const openCAPAs = capaRecords.filter(
    (c) => c.status === "OPEN" || c.status === "IN_PROGRESS"
  );
  const overdueCAPAs = capaRecords.filter((c) => c.status === "OVERDUE");

  if (overdueCAPAs.length > 0) {
    score -= overdueCAPAs.length * 10;
    issues.push({
      category: "audit",
      severity: "critical",
      code: "CAPA_OVERDUE",
      message: `${overdueCAPAs.length} overdue corrective action(s)`,
      actionRequired: "Address overdue CAPAs immediately",
    });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    details: {
      lastAuditDate: lastAudit?.completedAt || null,
      lastAuditRating,
      daysSinceLastAudit,
      openCAPACount: openCAPAs.length,
      overdueCAPACount: overdueCAPAs.length,
    },
  };
}

// ============================================================================
// Tier Eligibility
// ============================================================================

function calculateTierEligibility(
  currentTier: CertificationTier,
  overallScore: number,
  insuranceResult: { score: number; policies: PolicyScore[] },
  personnelResult: { details: PersonnelDetails },
  issues: ComplianceIssue[]
): TierEligibility {
  const blockers: string[] = [];
  let nextTier: CertificationTier | null = null;
  let eligibleForUpgrade = false;

  const tierOrder: CertificationTier[] = [
    "ACCREDITED",
    "CERTIFIED",
    "MASTER_ROOFER",
  ];
  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex < tierOrder.length - 1) {
    nextTier = tierOrder[currentIndex + 1];

    // Check eligibility for next tier
    const scoreThresholds: Record<CertificationTier, number> = {
      ACCREDITED: 0,
      CERTIFIED: 70,
      MASTER_ROOFER: 90,
    };

    const requiredScore = scoreThresholds[nextTier];

    if (overallScore < requiredScore) {
      blockers.push(
        `Overall compliance score (${overallScore}%) below ${requiredScore}% threshold`
      );
    }

    // Check critical issues
    const criticalIssues = issues.filter((i) => i.severity === "critical");
    if (criticalIssues.length > 0) {
      blockers.push(`${criticalIssues.length} critical issue(s) must be resolved`);
    }

    // Check verified LBP requirement for higher tiers
    if (nextTier === "MASTER_ROOFER") {
      if (personnelResult.details.lbpVerifiedCount < 2) {
        blockers.push("Master Roofer requires at least 2 verified LBP holders");
      }
    }

    eligibleForUpgrade = blockers.length === 0;
  }

  return {
    currentTier,
    eligibleForUpgrade,
    nextTier,
    blockers,
  };
}

// ============================================================================
// Update Compliance Score in Database
// ============================================================================

export async function updateOrganizationComplianceScore(
  organizationId: string
): Promise<ComplianceResult> {
  const result = await calculateComplianceScore(organizationId);

  // Update database with compliance scores
  const updatedOrg = await db.organization.update({
    where: { id: organizationId },
    data: {
      complianceScore: result.overallScore,
      complianceDocScore: result.breakdown.documentation.score,
      complianceInsScore: result.breakdown.insurance.score,
      compliancePersScore: result.breakdown.personnel.score,
      complianceAuditScore: result.breakdown.audit.score,
      complianceLastCalc: new Date(),
    },
    select: {
      certificationTier: true,
    },
  });

  // Check if insurance is valid (any PUBLIC_LIABILITY policy not expired)
  const validInsurance = await db.insurancePolicy.findFirst({
    where: {
      organizationId,
      policyType: "PUBLIC_LIABILITY",
      expiryDate: { gte: new Date() },
    },
  });

  // Sync to Clerk metadata for JWT session claims (non-blocking)
  syncOrgMetadataToClerk(organizationId, {
    certificationTier: updatedOrg.certificationTier,
    complianceScore: result.overallScore,
    insuranceValid: !!validInsurance,
  }).catch((error) => {
    // Already logged in syncOrgMetadataToClerk, just ensure no unhandled rejection
    console.error("[compliance-v2] Clerk sync failed (non-blocking):", error);
  });

  return result;
}

// ============================================================================
// Compliance Status Helpers
// ============================================================================

export function getComplianceStatus(score: number): {
  status: "compliant" | "at-risk" | "critical";
  label: string;
  color: string;
} {
  if (score >= COMPLIANCE_THRESHOLDS.COMPLIANT) {
    return { status: "compliant", label: "Compliant", color: "green" };
  }
  if (score >= COMPLIANCE_THRESHOLDS.AT_RISK) {
    return { status: "at-risk", label: "At Risk", color: "yellow" };
  }
  return { status: "critical", label: "Critical", color: "red" };
}

export function getComplianceStatusColor(status: ComplianceStatus): string {
  switch (status) {
    case "COMPLIANT":
      return "green";
    case "PARTIAL":
      return "yellow";
    case "NON_COMPLIANT":
      return "red";
    case "NOT_ASSESSED":
      return "gray";
    case "NOT_APPLICABLE":
      return "slate";
    default:
      return "gray";
  }
}

// ============================================================================
// Helpers
// ============================================================================

function formatElement(element: ISOElement): string {
  return element
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function formatPolicyType(type: InsurancePolicyType): string {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
