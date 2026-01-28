"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  BarChart3,
  Users,
  Shield,
  ClipboardCheck,
  AlertTriangle,
  Building,
  Star,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPORT_TYPE_LABELS, type ReportType, type CertificationTier } from "@/types";

interface ReportConfig {
  type: ReportType;
  icon: typeof FileText;
  description: string;
}

const reportConfigs: ReportConfig[] = [
  {
    type: "COMPLIANCE_SUMMARY",
    icon: BarChart3,
    description: "Overview of member compliance scores, distributions, and trends",
  },
  {
    type: "MEMBER_DIRECTORY",
    icon: Users,
    description: "Complete list of members with contact details and certification status",
  },
  {
    type: "AUDIT_SUMMARY",
    icon: ClipboardCheck,
    description: "Audit statistics, findings analysis, and pass rates",
  },
  {
    type: "INSURANCE_STATUS",
    icon: Shield,
    description: "Insurance policy status and expiry tracking",
  },
  {
    type: "LBP_STATUS",
    icon: Building,
    description: "Licensed Building Practitioner verification status",
  },
  {
    type: "CAPA_SUMMARY",
    icon: AlertTriangle,
    description: "Corrective action tracking and resolution metrics",
  },
  {
    type: "PROJECT_PORTFOLIO",
    icon: FileText,
    description: "Member project statistics and quality metrics",
  },
  {
    type: "TIER_ANALYSIS",
    icon: TrendingUp,
    description: "Comparison of metrics across certification tiers",
  },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [tierFilter, setTierFilter] = useState<CertificationTier | "">("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async (reportType: ReportType) => {
    setLoading(true);
    setError(null);
    setSelectedReport(reportType);

    try {
      const params: Record<string, string> = {
        reportType,
        format: "JSON",
      };
      if (tierFilter) params.tier = tierFilter;

      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const data = await response.json();
      setReportData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!reportData || !selectedReport) return;

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedReport.toLowerCase()}_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderReportData = () => {
    if (!reportData || !selectedReport) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = reportData as any;

    switch (selectedReport) {
      case "COMPLIANCE_SUMMARY":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Members" value={data.totalMembers} />
              <StatCard
                label="Avg Compliance"
                value={`${Math.round(data.averageScore)}%`}
              />
              <StatCard label="Excellent (90%+)" value={data.scoreDistribution?.excellent} />
              <StatCard label="Critical (<50%)" value={data.scoreDistribution?.critical} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">By Tier</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Master Roofer</span>
                      <span className="font-medium">{data.byTier?.MASTER_ROOFER || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Certified</span>
                      <span className="font-medium">{data.byTier?.CERTIFIED || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Accredited</span>
                      <span className="font-medium">{data.byTier?.ACCREDITED || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Insurance Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-600">All Valid</span>
                      <span className="font-medium">{data.insuranceStatus?.allValid || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Expiring Soon</span>
                      <span className="font-medium">{data.insuranceStatus?.expiringSoon || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Expired</span>
                      <span className="font-medium">{data.insuranceStatus?.expired || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">LBP Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-600">All Verified</span>
                      <span className="font-medium">{data.lbpStatus?.allVerified || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Some Unverified</span>
                      <span className="font-medium">{data.lbpStatus?.someUnverified || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">None Verified</span>
                      <span className="font-medium">{data.lbpStatus?.noneVerified || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {data.topIssues?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Lowest Scoring ISO Elements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.topIssues.map((issue: { element: string; avgScore: number; count: number }) => (
                      <div key={issue.element} className="flex justify-between items-center">
                        <span className="text-slate-600">{issue.element.replace(/_/g, " ")}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-400">{issue.count} orgs</span>
                          <span className="font-medium">{Math.round(issue.avgScore)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "TIER_ANALYSIS":
        return (
          <div className="space-y-4">
            {data.tiers?.map((tier: {
              tier: string;
              count: number;
              avgComplianceScore: number;
              avgStaffCount: number;
              avgDocumentCount: number;
              auditPassRate: number;
            }) => (
              <Card key={tier.tier}>
                <CardHeader className="pb-2">
                  <CardTitle>{tier.tier.replace(/_/g, " ")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Members</p>
                      <p className="text-2xl font-bold">{tier.count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Avg Compliance</p>
                      <p className="text-2xl font-bold">{tier.avgComplianceScore}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Avg Staff</p>
                      <p className="text-2xl font-bold">{tier.avgStaffCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Avg Documents</p>
                      <p className="text-2xl font-bold">{tier.avgDocumentCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Audit Pass Rate</p>
                      <p className="text-2xl font-bold">{tier.auditPassRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "AUDIT_SUMMARY":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Audits" value={data.totalAudits} />
              <StatCard
                label="Avg Major Findings"
                value={data.averageFindings?.major?.toFixed(1)}
              />
              <StatCard
                label="Avg Minor Findings"
                value={data.averageFindings?.minor?.toFixed(1)}
              />
              <StatCard
                label="Avg Observations"
                value={data.averageFindings?.observations?.toFixed(1)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">By Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(data.byStatus || {}).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span className="text-slate-600">{status.replace(/_/g, " ")}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">By Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(data.byRating || {}).map(([rating, count]) => (
                      <div key={rating} className="flex justify-between">
                        <span className="text-slate-600">{rating.replace(/_/g, " ")}</span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return (
          <Card>
            <CardContent className="pt-6">
              <pre className="text-xs overflow-auto max-h-96 bg-slate-50 p-4 rounded">
                {JSON.stringify(data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500">Generate and download compliance reports</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as CertificationTier | "")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Tiers</SelectItem>
              <SelectItem value="MASTER_ROOFER">Master Roofer</SelectItem>
              <SelectItem value="CERTIFIED">Certified</SelectItem>
              <SelectItem value="ACCREDITED">Accredited</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportConfigs.map((config) => (
          <Card
            key={config.type}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedReport === config.type ? "ring-2 ring-blue-500" : ""
            }`}
            onClick={() => generateReport(config.type)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <config.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">
                    {REPORT_TYPE_LABELS[config.type]}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {config.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Results */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-4 text-slate-600">Generating report...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && reportData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedReport && REPORT_TYPE_LABELS[selectedReport]}
            </h2>
            <Button variant="outline" onClick={downloadJSON}>
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
          </div>
          {renderReportData()}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value ?? "-"}</p>
      </CardContent>
    </Card>
  );
}
