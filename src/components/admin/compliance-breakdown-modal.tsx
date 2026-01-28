"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  AlertCircle,
  AlertTriangle,
  Info,
  Shield,
  Users,
  FileText,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CERTIFICATION_TIER_LABELS,
  getComplianceStatusLevel,
  COMPLIANCE_STATUS_METADATA,
  type CertificationTier,
} from "@/types";

interface ComplianceBreakdownModalProps {
  orgId: string | null; // null = closed
  onClose: () => void;
}

interface ComplianceDrillDown {
  organizationId: string;
  organizationName: string;
  tradingName: string | null;
  tier: CertificationTier;
  overallScore: number;
  breakdown: {
    documentation: {
      score: number;
      weight: number;
      completeElements: number;
      totalElements: number;
    };
    insurance: {
      score: number;
      weight: number;
      validPolicies: number;
      requiredPolicies: number;
    };
    personnel: {
      score: number;
      weight: number;
      totalMembers: number;
      lbpVerifiedCount: number;
    };
    audit: {
      score: number;
      weight: number;
      lastAuditDate: string | null;
      daysSinceLastAudit: number | null;
    };
  };
  issues: Array<{
    category: string;
    severity: string;
    message: string;
    actionRequired: string | null;
  }>;
  tierEligibility: {
    currentTier: string;
    eligibleForUpgrade: boolean;
    nextTier: string | null;
    blockers: string[];
  };
}

const tierColors: Record<CertificationTier, string> = {
  ACCREDITED: "bg-slate-100 text-slate-700",
  CERTIFIED: "bg-blue-100 text-blue-700",
  MASTER_ROOFER: "bg-amber-100 text-amber-700",
};

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "info":
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <Info className="h-4 w-4 text-slate-400" />;
  }
}

export function ComplianceBreakdownModal({
  orgId,
  onClose,
}: ComplianceBreakdownModalProps) {
  const [data, setData] = useState<ComplianceDrillDown | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!orgId) {
      setData(null);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/compliance/${orgId}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          console.error("Failed to fetch compliance data:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch compliance data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId]);

  const handleDownloadPDF = async () => {
    if (!orgId) return;
    setDownloading(true);
    try {
      const response = await fetch(`/api/admin/reports/organization/${orgId}`);
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-report-${data?.organizationName
        .toLowerCase()
        .replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={orgId !== null} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {loading ? "Loading..." : data?.organizationName || "Compliance Breakdown"}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Fetching compliance details..."
              : "Detailed compliance breakdown across all dimensions"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Header with tier and overall score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={tierColors[data.tier]}>
                  {CERTIFICATION_TIER_LABELS[data.tier]}
                </Badge>
                {data.tradingName && (
                  <span className="text-sm text-slate-500">
                    t/a {data.tradingName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-slate-500">Overall Score</p>
                  <p
                    className={cn(
                      "text-3xl font-bold",
                      COMPLIANCE_STATUS_METADATA[
                        getComplianceStatusLevel(data.overallScore)
                      ].textColor
                    )}
                  >
                    {data.overallScore}%
                  </p>
                </div>
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    getComplianceStatusLevel(data.overallScore) === "compliant" &&
                      "bg-green-500",
                    getComplianceStatusLevel(data.overallScore) === "at-risk" &&
                      "bg-yellow-500",
                    getComplianceStatusLevel(data.overallScore) === "critical" &&
                      "bg-red-500"
                  )}
                />
              </div>
            </div>

            {/* Dimension Grid */}
            <div className="grid grid-cols-2 gap-4">
              <DimensionCard
                icon={<FileText className="h-5 w-5" />}
                label="Documentation"
                score={data.breakdown.documentation.score}
                weight={data.breakdown.documentation.weight}
                detail={`${data.breakdown.documentation.completeElements}/${data.breakdown.documentation.totalElements} elements`}
              />
              <DimensionCard
                icon={<Shield className="h-5 w-5" />}
                label="Insurance"
                score={data.breakdown.insurance.score}
                weight={data.breakdown.insurance.weight}
                detail={`${data.breakdown.insurance.validPolicies}/${data.breakdown.insurance.requiredPolicies} policies`}
              />
              <DimensionCard
                icon={<Users className="h-5 w-5" />}
                label="Personnel"
                score={data.breakdown.personnel.score}
                weight={data.breakdown.personnel.weight}
                detail={`${data.breakdown.personnel.lbpVerifiedCount} verified LBP`}
              />
              <DimensionCard
                icon={<ClipboardCheck className="h-5 w-5" />}
                label="Audits"
                score={data.breakdown.audit.score}
                weight={data.breakdown.audit.weight}
                detail={
                  data.breakdown.audit.lastAuditDate
                    ? `${data.breakdown.audit.daysSinceLastAudit}d ago`
                    : "No audit"
                }
              />
            </div>

            {/* Issues Section */}
            {data.issues.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                  Issues ({data.issues.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {issue.message}
                        </p>
                        {issue.actionRequired && (
                          <p className="text-xs text-slate-600 mt-1">
                            {issue.actionRequired}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs capitalize shrink-0"
                      >
                        {issue.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tier Eligibility */}
            {data.tierEligibility.nextTier && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-slate-900 mb-2">
                  Tier Eligibility
                </h3>
                {data.tierEligibility.eligibleForUpgrade ? (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      Eligible for upgrade to{" "}
                      {CERTIFICATION_TIER_LABELS[
                        data.tierEligibility.nextTier as CertificationTier
                      ]}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm font-medium text-yellow-900 mb-2">
                      Not yet eligible for{" "}
                      {CERTIFICATION_TIER_LABELS[
                        data.tierEligibility.nextTier as CertificationTier
                      ]}
                    </p>
                    <ul className="text-xs text-yellow-800 space-y-1">
                      {data.tierEligibility.blockers.map((blocker, idx) => (
                        <li key={idx}>• {blocker}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleDownloadPDF} disabled={downloading}>
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate PDF Report
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            No data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DimensionCardProps {
  icon: React.ReactNode;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

function DimensionCard({
  icon,
  label,
  score,
  weight,
  detail,
}: DimensionCardProps) {
  const status = getComplianceStatusLevel(score);
  const metadata = COMPLIANCE_STATUS_METADATA[status];

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-slate-600">{icon}</div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-slate-900">{label}</h4>
          <p className="text-xs text-slate-500">Weight: {Math.round(weight * 100)}%</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <span className={cn("text-2xl font-bold", metadata.textColor)}>
          {score}%
        </span>
        <div
          className={cn(
            "h-2 flex-1 rounded-full bg-slate-100 overflow-hidden"
          )}
        >
          <div
            className={cn(
              "h-full transition-all",
              status === "compliant" && "bg-green-500",
              status === "at-risk" && "bg-yellow-500",
              status === "critical" && "bg-red-500"
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-slate-600">{detail}</p>
    </div>
  );
}
