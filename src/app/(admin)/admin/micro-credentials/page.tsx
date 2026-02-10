"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Eye,
  BarChart3,
  Users,
  Award,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CERTIFICATION_TIER_LABELS,
  MICRO_CREDENTIAL_STATUS_LABELS,
} from "@/types";
import type { CertificationTier, MicroCredentialStatus } from "@/types";

interface CredentialDefinition {
  id: string;
  title: string;
  level: number;
  skillStandard: string | null;
  issuingBody: string;
  requirements: string | null;
  isDefault: boolean;
  createdAt: string;
  _count: {
    staffCredentials: number;
  };
}

interface FormData {
  title: string;
  level: string;
  skillStandard: string;
  issuingBody: string;
  requirements: string;
}

interface ReportSummary {
  totalOrganizations: number;
  totalStaff: number;
  totalCredentialsAssigned: number;
  totalCredentialsAwarded: number;
  overallCoveragePercent: number;
}

interface OrgReport {
  id: string;
  name: string;
  tradingName: string | null;
  certificationTier: string | null;
  staffCount: number;
  credentialsAssigned: number;
  credentialsAwarded: number;
  credentialsByStatus: Record<string, number>;
  coveragePercent: number;
}

interface CoverageReport {
  summary: ReportSummary;
  organizations: OrgReport[];
}

const emptyForm: FormData = {
  title: "",
  level: "",
  skillStandard: "",
  issuingBody: "RANZ",
  requirements: "",
};

type ActiveView = "definitions" | "report";

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "text-slate-500",
  IN_TRAINING: "text-blue-600",
  ASSESSMENT_PENDING: "text-yellow-600",
  AWARDED: "text-green-600",
  EXPIRED: "text-red-600",
};

const TIER_BADGE_COLORS: Record<string, string> = {
  ACCREDITED: "bg-blue-100 text-blue-800",
  CERTIFIED: "bg-green-100 text-green-800",
  MASTER_ROOFER: "bg-amber-100 text-amber-800",
};

export default function AdminMicroCredentialsPage() {
  const [activeView, setActiveView] = useState<ActiveView>("definitions");
  const [definitions, setDefinitions] = useState<CredentialDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Report state
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  async function fetchDefinitions() {
    try {
      const response = await fetch("/api/admin/micro-credentials");
      if (response.ok) {
        const data = await response.json();
        setDefinitions(data);
      }
    } catch (err) {
      console.error("Failed to fetch definitions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReport() {
    setReportLoading(true);
    try {
      const response = await fetch("/api/admin/micro-credentials/report");
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
    } catch (err) {
      console.error("Failed to fetch coverage report:", err);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    fetchDefinitions();
  }, []);

  useEffect(() => {
    if (activeView === "report" && !report) {
      fetchReport();
    }
  }, [activeView, report]);

  function openCreateForm() {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function openEditForm(def: CredentialDefinition) {
    setFormData({
      title: def.title,
      level: String(def.level),
      skillStandard: def.skillStandard || "",
      issuingBody: def.issuingBody,
      requirements: def.requirements || "",
    });
    setEditingId(def.id);
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setError(null);
  }

  async function handleSave() {
    setError(null);

    const level = parseInt(formData.level, 10);
    if (isNaN(level) || level < 1 || level > 10) {
      setError("Level must be a number between 1 and 10.");
      return;
    }

    if (formData.title.length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }

    if (!formData.issuingBody.trim()) {
      setError("Issuing body is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        level,
        skillStandard: formData.skillStandard.trim() || undefined,
        issuingBody: formData.issuingBody.trim(),
        requirements: formData.requirements.trim() || undefined,
      };

      const url = editingId
        ? `/api/admin/micro-credentials/${editingId}`
        : "/api/admin/micro-credentials";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccessMessage(
          editingId
            ? "Definition updated successfully."
            : "Definition created successfully."
        );
        setTimeout(() => setSuccessMessage(null), 3000);
        cancelForm();
        setLoading(true);
        await fetchDefinitions();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save definition.");
      }
    } catch (err) {
      console.error("Failed to save:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(def: CredentialDefinition) {
    if (def.isDefault) {
      window.alert(
        "Default credential definitions cannot be deleted. These are core RANZ credentials."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete credential definition "${def.title}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/micro-credentials/${def.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccessMessage("Definition deleted successfully.");
        setTimeout(() => setSuccessMessage(null), 3000);
        setLoading(true);
        await fetchDefinitions();
      } else {
        const data = await response.json();
        window.alert(data.error || "Failed to delete definition.");
      }
    } catch (err) {
      console.error("Failed to delete:", err);
      window.alert("An error occurred. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="h-12 bg-slate-200 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Micro-credentials
            </h1>
            <p className="text-slate-500">
              {activeView === "definitions"
                ? `${definitions.length} definition${definitions.length !== 1 ? "s" : ""}`
                : "Coverage report across organisations"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeView === "definitions" && !showForm && (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Definition
            </Button>
          )}
        </div>
      </div>

      {/* View toggle tabs */}
      <div className="flex border-b border-slate-200">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeView === "definitions"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveView("definitions")}
        >
          <GraduationCap className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
          Definitions
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeView === "report"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveView("report")}
        >
          <BarChart3 className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
          Coverage Report
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}

      {/* Definitions View */}
      {activeView === "definitions" && (
        <>
          {/* Inline Create/Edit Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingId ? "Edit Definition" : "New Credential Definition"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Title *
                      </label>
                      <Input
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        placeholder="e.g., Reclad/Reroofing Level 5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        NQF Level * (1-10)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.level}
                        onChange={(e) =>
                          setFormData({ ...formData, level: e.target.value })
                        }
                        placeholder="e.g., 5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Issuing Body *
                      </label>
                      <Input
                        value={formData.issuingBody}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            issuingBody: e.target.value,
                          })
                        }
                        placeholder="e.g., RANZ, NZQA"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Skill Standard Reference
                      </label>
                      <Input
                        value={formData.skillStandard}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            skillStandard: e.target.value,
                          })
                        }
                        placeholder="e.g., NZQA Unit Standard 12345"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Requirements
                    </label>
                    <textarea
                      className="w-full min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.requirements}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requirements: e.target.value,
                        })
                      }
                      placeholder="Description of requirements to achieve this credential..."
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={cancelForm}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      )}
                      {editingId ? "Save Changes" : "Create"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Definitions Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Credential Definitions ({definitions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {definitions.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">
                    No credential definitions found.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-slate-600">
                          Title
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">
                          Level
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">
                          Issuing Body
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">
                          Skill Standard
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">
                          Assigned
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">
                          Type
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {definitions.map((def) => (
                        <tr key={def.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">
                              {def.title}
                            </p>
                            {def.requirements && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                {def.requirements}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className="bg-slate-50 text-slate-700"
                            >
                              Level {def.level}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {def.issuingBody}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">
                            {def.skillStandard || (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium">
                              {def._count.staffCredentials}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {def.isDefault ? (
                              <Badge className="bg-blue-100 text-blue-800">
                                Default
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-slate-500"
                              >
                                Custom
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/micro-credentials/${def.id}`}
                              >
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  View
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditForm(def)}
                              >
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                disabled={def.isDefault}
                                onClick={() => handleDelete(def)}
                                title={
                                  def.isDefault
                                    ? "Default definitions cannot be deleted"
                                    : "Delete definition"
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Delete
                              </Button>
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
        </>
      )}

      {/* Coverage Report View */}
      {activeView === "report" && (
        <>
          {reportLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 bg-slate-200 rounded-lg" />
                ))}
              </div>
              <div className="h-64 bg-slate-200 rounded-lg" />
            </div>
          ) : report ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Users className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Organisations</p>
                        <p className="text-xl font-bold text-slate-900">
                          {report.summary.totalOrganizations}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total Staff</p>
                        <p className="text-xl font-bold text-slate-900">
                          {report.summary.totalStaff}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <BookOpen className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Assigned</p>
                        <p className="text-xl font-bold text-slate-900">
                          {report.summary.totalCredentialsAssigned}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Award className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Awarded</p>
                        <p className="text-xl font-bold text-slate-900">
                          {report.summary.totalCredentialsAwarded}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">
                          Overall Coverage
                        </p>
                        <p className="text-xl font-bold text-slate-900">
                          {report.summary.overallCoveragePercent}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Per-Organisation Table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Organisation Coverage (
                    {report.organizations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.organizations.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">
                        No organisations found.
                      </p>
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
                            <th className="text-right py-3 px-4 font-medium text-slate-600">
                              Staff
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-slate-600">
                              Assigned
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-slate-600">
                              Awarded
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-slate-600">
                              Coverage
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-slate-600">
                              Status Breakdown
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {report.organizations.map((org) => (
                            <tr key={org.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4">
                                <p className="font-medium text-slate-900">
                                  {org.name}
                                </p>
                                {org.tradingName && (
                                  <p className="text-xs text-slate-400">
                                    t/a {org.tradingName}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {org.certificationTier ? (
                                  <Badge
                                    className={
                                      TIER_BADGE_COLORS[
                                        org.certificationTier
                                      ] || "bg-slate-100 text-slate-700"
                                    }
                                  >
                                    {CERTIFICATION_TIER_LABELS[
                                      org.certificationTier as CertificationTier
                                    ] || org.certificationTier}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-slate-300">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-sm">
                                {org.staffCount}
                              </td>
                              <td className="py-3 px-4 text-right text-sm">
                                {org.credentialsAssigned}
                              </td>
                              <td className="py-3 px-4 text-right text-sm font-medium">
                                {org.credentialsAwarded}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span
                                  className={`text-sm font-bold ${
                                    org.coveragePercent >= 75
                                      ? "text-green-600"
                                      : org.coveragePercent >= 25
                                        ? "text-yellow-600"
                                        : "text-slate-400"
                                  }`}
                                >
                                  {org.coveragePercent}%
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                                  {Object.entries(org.credentialsByStatus)
                                    .filter(([, count]) => count > 0)
                                    .map(([status, count]) => (
                                      <span
                                        key={status}
                                        className={
                                          STATUS_COLORS[status] ||
                                          "text-slate-500"
                                        }
                                      >
                                        {count}{" "}
                                        {MICRO_CREDENTIAL_STATUS_LABELS[
                                          status as MicroCredentialStatus
                                        ] || status}
                                      </span>
                                    ))}
                                  {Object.values(
                                    org.credentialsByStatus
                                  ).every((c) => c === 0) && (
                                    <span className="text-slate-300">
                                      No credentials
                                    </span>
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
            </>
          ) : (
            <div className="text-center py-12 text-slate-500">
              Failed to load coverage report.
            </div>
          )}
        </>
      )}
    </div>
  );
}
