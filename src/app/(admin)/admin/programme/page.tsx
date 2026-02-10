"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Award,
  Search,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PROGRAMME_ENROLMENT_STATUS_LABELS,
  CERTIFICATION_TIER_LABELS,
  type ProgrammeEnrolmentStatus,
  type CertificationTier,
} from "@/types";

interface EnrolmentOrg {
  id: string;
  name: string;
  tradingName: string | null;
  nzbn: string | null;
  certificationTier: CertificationTier;
  complianceScore: number;
  email: string | null;
  city: string | null;
}

interface Enrolment {
  id: string;
  status: ProgrammeEnrolmentStatus;
  appliedAt: string;
  activeSince: string | null;
  anniversaryDate: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  organization: EnrolmentOrg;
}

const statusColors: Record<ProgrammeEnrolmentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  RENEWAL_DUE: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-800",
  WITHDRAWN: "bg-slate-100 text-slate-600",
};

const tierColors: Record<CertificationTier, string> = {
  ACCREDITED: "bg-slate-100 text-slate-700",
  CERTIFIED: "bg-blue-100 text-blue-700",
  MASTER_ROOFER: "bg-amber-100 text-amber-700",
};

function AdminProgrammeContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";

  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function fetchEnrolments() {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const response = await fetch(`/api/admin/programme?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEnrolments(data);
      }
    } catch (error) {
      console.error("Failed to fetch enrolments:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    const debounce = setTimeout(fetchEnrolments, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  async function handleAction(
    enrolmentId: string,
    action: "approve" | "reject" | "suspend" | "reinstate",
    orgName: string
  ) {
    const actionLabels: Record<string, string> = {
      approve: "approve",
      reject: "reject",
      suspend: "suspend",
      reinstate: "reinstate",
    };

    let extraInput = "";

    if (action === "reject" || action === "approve") {
      const input = window.prompt(
        `${action === "approve" ? "Approve" : "Reject"} enrolment for ${orgName}?\n\nOptional notes:`
      );
      if (input === null) return; // User cancelled
      extraInput = input;
    } else if (action === "suspend") {
      const input = window.prompt(
        `Suspend enrolment for ${orgName}?\n\nReason for suspension:`
      );
      if (input === null) return;
      extraInput = input;
    } else if (action === "reinstate") {
      const confirmed = window.confirm(
        `Reinstate enrolment for ${orgName}?`
      );
      if (!confirmed) return;
    }

    setActionLoading(enrolmentId);
    try {
      const body: Record<string, string> = { action };
      if (action === "suspend" && extraInput) {
        body.reason = extraInput;
      } else if (extraInput) {
        body.notes = extraInput;
      }

      const response = await fetch(`/api/admin/programme/${enrolmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSuccessMessage(
          `Successfully ${actionLabels[action]}d enrolment for ${orgName}`
        );
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchEnrolments();
      } else {
        const data = await response.json();
        window.alert(`Action failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to perform action:", error);
      window.alert("An error occurred. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

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

  const statusOptions: { value: string; label: string }[] = [
    { value: "", label: "All Statuses" },
    { value: "PENDING", label: "Pending" },
    { value: "ACTIVE", label: "Active" },
    { value: "RENEWAL_DUE", label: "Renewal Due" },
    { value: "SUSPENDED", label: "Suspended" },
    { value: "WITHDRAWN", label: "Withdrawn" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Programme Enrolments
            </h1>
            <p className="text-slate-500">
              {enrolments.length} enrolment{enrolments.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by organisation name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={statusFilter === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrolments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enrolments ({enrolments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {enrolments.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No enrolments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Organisation
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Tier
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Applied
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Anniversary
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Compliance
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {enrolments.map((enrolment) => (
                    <tr key={enrolment.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {enrolment.organization.name}
                          </p>
                          {enrolment.organization.tradingName && (
                            <p className="text-sm text-slate-500">
                              t/a {enrolment.organization.tradingName}
                            </p>
                          )}
                          {enrolment.organization.city && (
                            <p className="text-xs text-slate-400">
                              {enrolment.organization.city}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            tierColors[
                              enrolment.organization.certificationTier
                            ]
                          }
                        >
                          {
                            CERTIFICATION_TIER_LABELS[
                              enrolment.organization.certificationTier
                            ]
                          }
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[enrolment.status]}>
                          {PROGRAMME_ENROLMENT_STATUS_LABELS[enrolment.status]}
                        </Badge>
                        {enrolment.suspendedReason && (
                          <p className="text-xs text-red-500 mt-1">
                            {enrolment.suspendedReason}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Clock className="h-3.5 w-3.5" />
                          {format(
                            new Date(enrolment.appliedAt),
                            "d MMM yyyy"
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {enrolment.anniversaryDate ? (
                          <span className="text-sm">
                            {format(
                              new Date(enrolment.anniversaryDate),
                              "d MMM yyyy"
                            )}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium">
                          {enrolment.organization.complianceScore}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {enrolment.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-700 border-green-300 hover:bg-green-50"
                                disabled={actionLoading === enrolment.id}
                                onClick={() =>
                                  handleAction(
                                    enrolment.id,
                                    "approve",
                                    enrolment.organization.name
                                  )
                                }
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                disabled={actionLoading === enrolment.id}
                                onClick={() =>
                                  handleAction(
                                    enrolment.id,
                                    "reject",
                                    enrolment.organization.name
                                  )
                                }
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {(enrolment.status === "ACTIVE" ||
                            enrolment.status === "RENEWAL_DUE") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-300 hover:bg-red-50"
                              disabled={actionLoading === enrolment.id}
                              onClick={() =>
                                handleAction(
                                  enrolment.id,
                                  "suspend",
                                  enrolment.organization.name
                                )
                              }
                            >
                              <Pause className="h-3.5 w-3.5 mr-1" />
                              Suspend
                            </Button>
                          )}
                          {enrolment.status === "SUSPENDED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300 hover:bg-green-50"
                              disabled={actionLoading === enrolment.id}
                              onClick={() =>
                                handleAction(
                                  enrolment.id,
                                  "reinstate",
                                  enrolment.organization.name
                                )
                              }
                            >
                              <Play className="h-3.5 w-3.5 mr-1" />
                              Reinstate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminProgrammeLoading() {
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

export default function AdminProgrammePage() {
  return (
    <Suspense fallback={<AdminProgrammeLoading />}>
      <AdminProgrammeContent />
    </Suspense>
  );
}
