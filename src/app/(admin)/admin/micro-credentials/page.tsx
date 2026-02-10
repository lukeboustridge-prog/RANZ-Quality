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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

const emptyForm: FormData = {
  title: "",
  level: "",
  skillStandard: "",
  issuingBody: "RANZ",
  requirements: "",
};

export default function AdminMicroCredentialsPage() {
  const [definitions, setDefinitions] = useState<CredentialDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  useEffect(() => {
    fetchDefinitions();
  }, []);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Micro-credential Definitions
            </h1>
            <p className="text-slate-500">
              {definitions.length} definition
              {definitions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            Create Definition
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}

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
                      setFormData({ ...formData, issuingBody: e.target.value })
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
                    setFormData({ ...formData, requirements: e.target.value })
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
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
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
          <CardTitle>Credential Definitions ({definitions.length})</CardTitle>
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
                          <Link href={`/admin/micro-credentials/${def.id}`}>
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
    </div>
  );
}
