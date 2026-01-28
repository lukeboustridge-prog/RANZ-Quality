"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  Search,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CERTIFICATION_TIER_LABELS,
  COMPLIANCE_STATUS_METADATA,
  getComplianceStatusLevel,
  type CertificationTier,
} from "@/types";
import { ComplianceBreakdownModal } from "@/components/admin/compliance-breakdown-modal";

interface Organization {
  id: string;
  clerkOrgId: string;
  name: string;
  tradingName: string | null;
  nzbn: string | null;
  certificationTier: CertificationTier;
  complianceScore: number;
  lastAuditDate: string | null;
  nextAuditDue: string | null;
  _count: {
    members: number;
    documents: number;
    insurancePolicies: number;
    audits: number;
  };
  insurancePolicies: Array<{
    policyType: string;
    expiryDate: string;
  }>;
  audits: Array<{
    rating: string;
    completedAt: string;
  }>;
}

interface Stats {
  total: number;
  compliant: number;
  atRisk: number;
  critical: number;
  avgScore: number;
}

const tierColors: Record<CertificationTier, string> = {
  ACCREDITED: "bg-slate-100 text-slate-700",
  CERTIFIED: "bg-blue-100 text-blue-700",
  MASTER_ROOFER: "bg-amber-100 text-amber-700",
};

function getComplianceColor(score: number): string {
  const status = getComplianceStatusLevel(score);
  return COMPLIANCE_STATUS_METADATA[status].textColor;
}

function getComplianceIcon(score: number) {
  const status = getComplianceStatusLevel(score);
  const colorClass = COMPLIANCE_STATUS_METADATA[status].textColor;
  if (status === 'compliant')
    return <CheckCircle className={`h-4 w-4 ${colorClass}`} />;
  if (status === 'at-risk')
    return <AlertCircle className={`h-4 w-4 ${colorClass}`} />;
  return <AlertTriangle className={`h-4 w-4 ${colorClass}`} />;
}

export default function AdminMembersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (tierFilter) params.set("tier", tierFilter);
        if (statusFilter) params.set("status", statusFilter);

        const response = await fetch(`/api/admin/members?${params}`);
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data.organizations);
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch members:", error);
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(fetchMembers, 300);
    return () => clearTimeout(debounce);
  }, [search, tierFilter, statusFilter]);

  const handleExport = async () => {
    // Create CSV
    const headers = [
      "Name",
      "Trading Name",
      "NZBN",
      "Tier",
      "Compliance Score",
      "Members",
      "Documents",
      "Last Audit",
    ];

    const rows = organizations.map((org) => [
      org.name,
      org.tradingName || "",
      org.nzbn || "",
      org.certificationTier,
      org.complianceScore,
      org._count.members,
      org._count.documents,
      org.lastAuditDate
        ? format(new Date(org.lastAuditDate), "yyyy-MM-dd")
        : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranz-members-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="h-12 bg-slate-200 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Members</h1>
          <p className="text-slate-500">
            {stats?.total || 0} certified businesses
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or NZBN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={tierFilter === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setTierFilter("")}
              >
                All Tiers
              </Button>
              <Button
                variant={tierFilter === "ACCREDITED" ? "default" : "outline"}
                size="sm"
                onClick={() => setTierFilter("ACCREDITED")}
              >
                Accredited
              </Button>
              <Button
                variant={tierFilter === "CERTIFIED" ? "default" : "outline"}
                size="sm"
                onClick={() => setTierFilter("CERTIFIED")}
              >
                Certified
              </Button>
              <Button
                variant={tierFilter === "MASTER_ROOFER" ? "default" : "outline"}
                size="sm"
                onClick={() => setTierFilter("MASTER_ROOFER")}
              >
                Master Roofer
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "compliant" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("compliant")}
                className={statusFilter === "compliant" ? "" : "text-green-600"}
              >
                Compliant
              </Button>
              <Button
                variant={statusFilter === "at-risk" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("at-risk")}
                className={statusFilter === "at-risk" ? "" : "text-yellow-600"}
              >
                At Risk
              </Button>
              <Button
                variant={statusFilter === "critical" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("critical")}
                className={statusFilter === "critical" ? "" : "text-red-600"}
              >
                Critical
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            Members ({organizations.length})
            {stats && (
              <span className="text-sm font-normal text-slate-500 ml-2">
                Avg score: {stats.avgScore}%
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Organization
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Tier
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Compliance
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Insurance
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Staff
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Last Audit
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {organizations.map((org) => (
                    <tr
                      key={org.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedOrgId(org.id)}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {org.name}
                          </p>
                          {org.tradingName && (
                            <p className="text-sm text-slate-500">
                              t/a {org.tradingName}
                            </p>
                          )}
                          {org.nzbn && (
                            <p className="text-xs text-slate-400">
                              NZBN: {org.nzbn}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={tierColors[org.certificationTier]}>
                          {CERTIFICATION_TIER_LABELS[org.certificationTier]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getComplianceIcon(org.complianceScore)}
                          <span
                            className={`font-medium ${getComplianceColor(org.complianceScore)}`}
                          >
                            {org.complianceScore}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Shield className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">
                            {org.insurancePolicies.length} active
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{org._count.members}</span>
                      </td>
                      <td className="py-3 px-4">
                        {org.lastAuditDate ? (
                          <div>
                            <p className="text-sm">
                              {format(
                                new Date(org.lastAuditDate),
                                "MMM d, yyyy"
                              )}
                            </p>
                            {org.audits[0]?.rating && (
                              <p className="text-xs text-slate-500">
                                {org.audits[0].rating}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            No audit
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/admin/members/${org.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ComplianceBreakdownModal
        orgId={selectedOrgId}
        onClose={() => setSelectedOrgId(null)}
      />
    </div>
  );
}
