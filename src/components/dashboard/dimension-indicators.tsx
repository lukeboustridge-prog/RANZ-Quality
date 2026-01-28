"use client";

import type { ComplianceBreakdown } from "@/lib/compliance-v2";
import { getComplianceStatusLevel, COMPLIANCE_STATUS_METADATA } from "@/types";
import { cn } from "@/lib/utils";
import { Shield, Users, FileText, ClipboardCheck } from "lucide-react";

interface DimensionIndicatorsProps {
  breakdown: ComplianceBreakdown;
}

export function DimensionIndicators({ breakdown }: DimensionIndicatorsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <DimensionCard
        label="Insurance"
        score={breakdown.insurance.score}
        icon={<Shield className="h-5 w-5" />}
        details={formatInsuranceDetails(breakdown.insurance)}
      />
      <DimensionCard
        label="Personnel"
        score={breakdown.personnel.score}
        icon={<Users className="h-5 w-5" />}
        details={formatPersonnelDetails(breakdown.personnel)}
      />
      <DimensionCard
        label="Documentation"
        score={breakdown.documentation.score}
        icon={<FileText className="h-5 w-5" />}
        details={formatDocumentationDetails(breakdown.documentation)}
      />
      <DimensionCard
        label="Audits"
        score={breakdown.audit.score}
        icon={<ClipboardCheck className="h-5 w-5" />}
        details={formatAuditDetails(breakdown.audit)}
      />
    </div>
  );
}

interface DimensionCardProps {
  label: string;
  score: number;
  icon: React.ReactNode;
  details: string;
}

function DimensionCard({ label, score, icon, details }: DimensionCardProps) {
  const status = getComplianceStatusLevel(score);
  const metadata = COMPLIANCE_STATUS_METADATA[status];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("text-slate-600")}>
          {icon}
        </div>
        <h3 className="text-sm font-medium text-slate-900">{label}</h3>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            status === "compliant" && "bg-green-500",
            status === "at-risk" && "bg-yellow-500",
            status === "critical" && "bg-red-500"
          )}
        />
        <span className={cn("text-2xl font-bold", metadata.textColor)}>
          {score}%
        </span>
      </div>

      <p className="text-xs text-slate-500">{details}</p>
    </div>
  );
}

// Helper functions to format details

function formatInsuranceDetails(insurance: ComplianceBreakdown["insurance"]): string {
  const validPolicies = insurance.policies.filter((p) => p.isValid).length;
  const requiredPolicies = insurance.policies.filter((p) => p.required).length;

  if (validPolicies === 0) {
    return "No active policies";
  }
  return `${validPolicies}/${requiredPolicies} active policies`;
}

function formatPersonnelDetails(personnel: ComplianceBreakdown["personnel"]): string {
  const { lbpVerifiedCount } = personnel.details;

  if (lbpVerifiedCount === 0) {
    return "No verified LBPs";
  }
  return `${lbpVerifiedCount} verified LBP${lbpVerifiedCount !== 1 ? "s" : ""}`;
}

function formatDocumentationDetails(documentation: ComplianceBreakdown["documentation"]): string {
  const completeElements = documentation.elements.filter(
    (e) => e.hasApprovedDoc
  ).length;

  return `${completeElements}/19 elements complete`;
}

function formatAuditDetails(audit: ComplianceBreakdown["audit"]): string {
  const { lastAuditDate } = audit.details;

  if (!lastAuditDate) {
    return "No audits yet";
  }

  const date = new Date(lastAuditDate);
  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince < 30) {
    return "Last audit: This month";
  } else if (daysSince < 365) {
    const monthsSince = Math.floor(daysSince / 30);
    return `Last audit: ${monthsSince} month${monthsSince !== 1 ? "s" : ""} ago`;
  } else {
    const yearsSince = Math.floor(daysSince / 365);
    return `Last audit: ${yearsSince} year${yearsSince !== 1 ? "s" : ""} ago`;
  }
}
