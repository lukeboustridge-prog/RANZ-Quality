"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  UserPlus,
  Loader2,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MICRO_CREDENTIAL_STATUS_LABELS } from "@/types";
import type { MicroCredentialStatus } from "@/types";

interface CredentialDefinition {
  id: string;
  title: string;
  level: number;
  skillStandard: string | null;
  issuingBody: string;
  requirements: string | null;
  isDefault: boolean;
  _count: { staffCredentials: number };
  statusCounts: Record<string, number>;
}

interface StaffCredential {
  id: string;
  definitionId: string;
  memberId: string;
  status: MicroCredentialStatus;
  awardedAt: string | null;
  awardedBy: string | null;
  expiryDate: string | null;
  notes: string | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    organization: {
      id: string;
      name: string;
    };
  };
}

interface Organization {
  id: string;
  name: string;
  tradingName: string | null;
  members: OrganizationMember[];
}

interface OrganizationMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const STATUS_COLORS: Record<MicroCredentialStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700",
  IN_TRAINING: "bg-blue-100 text-blue-700",
  ASSESSMENT_PENDING: "bg-yellow-100 text-yellow-700",
  AWARDED: "bg-green-100 text-green-700",
  EXPIRED: "bg-red-100 text-red-700",
};

const ALL_STATUSES: MicroCredentialStatus[] = [
  "NOT_STARTED",
  "IN_TRAINING",
  "ASSESSMENT_PENDING",
  "AWARDED",
  "EXPIRED",
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CredentialDefinitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [definition, setDefinition] = useState<CredentialDefinition | null>(
    null
  );
  const [staffList, setStaffList] = useState<StaffCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Assignment form state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Inline status edit state
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(
    null
  );
  const [editStatus, setEditStatus] = useState<MicroCredentialStatus>(
    "NOT_STARTED"
  );
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchDefinition = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/micro-credentials/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDefinition(data);
      }
    } catch (err) {
      console.error("Failed to fetch definition:", err);
    }
  }, [id]);

  const fetchStaffList = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/micro-credentials/${id}/staff`);
      if (response.ok) {
        const data = await response.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error("Failed to fetch staff list:", err);
    }
  }, [id]);

  useEffect(() => {
    async function loadData() {
      await Promise.all([fetchDefinition(), fetchStaffList()]);
      setLoading(false);
    }
    loadData();
  }, [fetchDefinition, fetchStaffList]);

  async function fetchOrganizations() {
    setLoadingOrgs(true);
    try {
      const response = await fetch("/api/admin/micro-credentials/assign");
      if (response.ok) {
        const data = await response.json();
        const orgsWithMembers: Organization[] = (
          data.organizations || []
        ).map(
          (org: { id: string; name: string; tradingName: string | null }) => ({
            id: org.id,
            name: org.name,
            tradingName: org.tradingName,
            members: [],
          })
        );
        setOrganizations(orgsWithMembers);
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    } finally {
      setLoadingOrgs(false);
    }
  }

  async function fetchOrgMembers(orgId: string) {
    try {
      const response = await fetch(
        `/api/admin/micro-credentials/assign?orgId=${orgId}`
      );
      if (response.ok) {
        const data = await response.json();
        const members = (data.members || []).map(
          (m: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
          }) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
          })
        );
        setOrganizations((prev) =>
          prev.map((org) =>
            org.id === orgId ? { ...org, members } : org
          )
        );
      }
    } catch (err) {
      console.error("Failed to fetch org members:", err);
    }
  }

  function openAssignForm() {
    setShowAssignForm(true);
    setSelectedOrgId("");
    setSelectedMemberId("");
    setAssignNotes("");
    setError(null);
    fetchOrganizations();
  }

  async function handleOrgSelect(orgId: string) {
    setSelectedOrgId(orgId);
    setSelectedMemberId("");
    if (orgId) {
      await fetchOrgMembers(orgId);
    }
  }

  async function handleAssign() {
    if (!selectedMemberId) {
      setError("Please select a staff member.");
      return;
    }

    setAssigning(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/micro-credentials/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          definitionId: id,
          memberId: selectedMemberId,
          notes: assignNotes.trim() || undefined,
        }),
      });

      if (response.ok) {
        setSuccessMessage("Staff member assigned successfully.");
        setTimeout(() => setSuccessMessage(null), 3000);
        setShowAssignForm(false);
        await Promise.all([fetchDefinition(), fetchStaffList()]);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to assign credential.");
      }
    } catch (err) {
      console.error("Failed to assign:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setAssigning(false);
    }
  }

  function startEditStatus(cred: StaffCredential) {
    setEditingCredentialId(cred.id);
    setEditStatus(cred.status);
    setEditExpiryDate(
      cred.expiryDate
        ? new Date(cred.expiryDate).toISOString().split("T")[0]
        : ""
    );
    setEditNotes(cred.notes || "");
  }

  function cancelEditStatus() {
    setEditingCredentialId(null);
    setEditStatus("NOT_STARTED");
    setEditExpiryDate("");
    setEditNotes("");
  }

  async function handleSaveStatus() {
    if (!editingCredentialId) return;

    setSavingStatus(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        staffCredentialId: editingCredentialId,
        status: editStatus,
        notes: editNotes.trim() || undefined,
      };

      if (editStatus === "AWARDED" && editExpiryDate) {
        payload.expiryDate = new Date(editExpiryDate).toISOString();
      } else if (editExpiryDate) {
        payload.expiryDate = new Date(editExpiryDate).toISOString();
      } else {
        payload.expiryDate = null;
      }

      const response = await fetch(
        `/api/admin/micro-credentials/${id}/staff`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        setSuccessMessage("Status updated successfully.");
        setTimeout(() => setSuccessMessage(null), 3000);
        cancelEditStatus();
        await Promise.all([fetchDefinition(), fetchStaffList()]);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update status.");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setSavingStatus(false);
    }
  }

  const filteredOrgs = organizations.filter(
    (org) =>
      !orgSearch ||
      org.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
      (org.tradingName &&
        org.tradingName.toLowerCase().includes(orgSearch.toLowerCase()))
  );

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="h-24 bg-slate-200 rounded" />
          <div className="h-48 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Definition not found.</p>
        <Link
          href="/admin/micro-credentials"
          className="text-blue-600 hover:underline text-sm mt-2 inline-block"
        >
          Back to Definitions
        </Link>
      </div>
    );
  }

  // Calculate summary stats from staffList
  const totalAssigned = staffList.length;
  const statusSummary = staffList.reduce(
    (acc, cred) => {
      acc[cred.status] = (acc[cred.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/micro-credentials"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Definitions
        </Link>
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-blue-600" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {definition.title}
              </h1>
              <Badge
                variant="outline"
                className="bg-slate-50 text-slate-700"
              >
                Level {definition.level}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              Issued by {definition.issuingBody}
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Definition Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Definition Details</CardTitle>
            <Link href="/admin/micro-credentials">
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Title</p>
              <p className="text-sm text-slate-900">{definition.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">NQF Level</p>
              <p className="text-sm text-slate-900">{definition.level}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Issuing Body
              </p>
              <p className="text-sm text-slate-900">
                {definition.issuingBody}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Skill Standard
              </p>
              <p className="text-sm text-slate-900">
                {definition.skillStandard || "-"}
              </p>
            </div>
            {definition.requirements && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-slate-500">
                  Requirements
                </p>
                <p className="text-sm text-slate-900 whitespace-pre-wrap">
                  {definition.requirements}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assigned Staff Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assigned Staff ({totalAssigned})</CardTitle>
            {!showAssignForm && (
              <Button onClick={openAssignForm}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Staff
              </Button>
            )}
          </div>

          {/* Summary stats */}
          {totalAssigned > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {ALL_STATUSES.map((s) =>
                statusSummary[s] ? (
                  <Badge key={s} className={STATUS_COLORS[s]}>
                    {statusSummary[s]} {MICRO_CREDENTIAL_STATUS_LABELS[s]}
                  </Badge>
                ) : null
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Assignment Form */}
          {showAssignForm && (
            <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">
                  Assign Staff Member
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {loadingOrgs ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading organisations...
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Search Organisation
                    </label>
                    <Input
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      placeholder="Type to filter organisations..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Select Organisation *
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedOrgId}
                      onChange={(e) => handleOrgSelect(e.target.value)}
                    >
                      <option value="">-- Select organisation --</option>
                      {filteredOrgs.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                          {org.tradingName
                            ? ` (${org.tradingName})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedOrgId && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Select Staff Member *
                      </label>
                      {selectedOrg && selectedOrg.members.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading staff members...
                        </div>
                      ) : (
                        <select
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={selectedMemberId}
                          onChange={(e) =>
                            setSelectedMemberId(e.target.value)
                          }
                        >
                          <option value="">
                            -- Select staff member --
                          </option>
                          {selectedOrg?.members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.firstName} {m.lastName} ({m.email})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      className="w-full min-h-[60px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                      placeholder="Optional notes about this assignment..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleAssign} disabled={assigning}>
                      {assigning && (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      )}
                      Assign Credential
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Staff List Table */}
          {totalAssigned === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                No staff members assigned to this credential yet.
              </p>
              {!showAssignForm && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={openAssignForm}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign First Staff Member
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Staff Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Organisation
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Awarded
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Expiry
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staffList.map((cred) => (
                    <tr key={cred.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">
                          {cred.member.firstName} {cred.member.lastName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {cred.member.email}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {cred.member.organization.name}
                      </td>
                      <td className="py-3 px-4">
                        {editingCredentialId === cred.id ? (
                          <select
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editStatus}
                            onChange={(e) =>
                              setEditStatus(
                                e.target.value as MicroCredentialStatus
                              )
                            }
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {MICRO_CREDENTIAL_STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge className={STATUS_COLORS[cred.status]}>
                            {MICRO_CREDENTIAL_STATUS_LABELS[cred.status]}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {formatDate(cred.awardedAt)}
                      </td>
                      <td className="py-3 px-4">
                        {editingCredentialId === cred.id ? (
                          <Input
                            type="date"
                            className="w-40"
                            value={editExpiryDate}
                            onChange={(e) =>
                              setEditExpiryDate(e.target.value)
                            }
                          />
                        ) : (
                          <span className="text-sm text-slate-600">
                            {formatDate(cred.expiryDate)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingCredentialId === cred.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveStatus}
                              disabled={savingStatus}
                            >
                              {savingStatus ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditStatus}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditStatus(cred)}
                          >
                            Update Status
                          </Button>
                        )}
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
