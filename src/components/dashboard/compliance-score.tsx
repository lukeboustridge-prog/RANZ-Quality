"use client";

import { cn } from "@/lib/utils";
import {
  CERTIFICATION_TIER_LABELS,
  COMPLIANCE_THRESHOLDS,
  COMPLIANCE_STATUS_METADATA,
  getComplianceStatusLevel,
  type CertificationTier,
} from "@/types";

interface ComplianceScoreProps {
  score: number;
  tier: CertificationTier;
}

export function ComplianceScore({ score, tier }: ComplianceScoreProps) {
  const getScoreColor = (score: number) => {
    const status = getComplianceStatusLevel(score);
    return COMPLIANCE_STATUS_METADATA[status].textColor;
  };

  const getScoreBackground = (score: number) => {
    const status = getComplianceStatusLevel(score);
    return COMPLIANCE_STATUS_METADATA[status].bgGradient;
  };

  const getTierBadgeColor = (tier: CertificationTier) => {
    switch (tier) {
      case "MASTER_ROOFER":
        return "bg-amber-100 text-amber-800";
      case "CERTIFIED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  // Calculate the stroke dash for the circular progress
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Compliance Status
          </h2>
          <p className="text-sm text-slate-500">Your current certification level</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
            getTierBadgeColor(tier)
          )}
        >
          {tier === "MASTER_ROOFER" && "🏆 "}
          {CERTIFICATION_TIER_LABELS[tier]}
        </span>
      </div>

      <div className="flex items-center gap-8">
        {/* Circular progress */}
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-slate-100"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="45"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop
                  offset="0%"
                  className={cn(
                    score >= COMPLIANCE_THRESHOLDS.COMPLIANT
                      ? "stop-color-green-500"
                      : score >= COMPLIANCE_THRESHOLDS.AT_RISK
                        ? "stop-color-yellow-500"
                        : "stop-color-red-500"
                  )}
                  style={{
                    stopColor:
                      score >= COMPLIANCE_THRESHOLDS.COMPLIANT
                        ? "#22c55e"
                        : score >= COMPLIANCE_THRESHOLDS.AT_RISK
                          ? "#eab308"
                          : "#ef4444",
                  }}
                />
                <stop
                  offset="100%"
                  style={{
                    stopColor:
                      score >= COMPLIANCE_THRESHOLDS.COMPLIANT
                        ? "#16a34a"
                        : score >= COMPLIANCE_THRESHOLDS.AT_RISK
                          ? "#ca8a04"
                          : "#dc2626",
                  }}
                />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold", getScoreColor(score))}>
              {score}%
            </span>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex-1 space-y-3">
          <StatusItem
            label="Insurance"
            status={score >= 80 ? "good" : "warning"}
            text={score >= 80 ? "Current" : "Review needed"}
          />
          <StatusItem
            label="Personnel"
            status={score >= COMPLIANCE_THRESHOLDS.AT_RISK ? "good" : "warning"}
            text={score >= COMPLIANCE_THRESHOLDS.AT_RISK ? "All LBPs verified" : "Verification needed"}
          />
          <StatusItem
            label="QMS Documentation"
            status={score >= 60 ? "good" : "warning"}
            text={score >= 60 ? "Up to date" : "Updates needed"}
          />
        </div>
      </div>
    </div>
  );
}

function StatusItem({
  label,
  status,
  text,
}: {
  label: string;
  status: "good" | "warning" | "critical";
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          status === "good" && "bg-green-500",
          status === "warning" && "bg-yellow-500",
          status === "critical" && "bg-red-500"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 truncate">{text}</p>
      </div>
    </div>
  );
}
