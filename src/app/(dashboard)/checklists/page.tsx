"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Copy,
  RotateCcw,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHECKLIST_ITEM_TYPE_LABELS } from "@/types";
import type { ChecklistItemType } from "@/types";

// --- Interfaces ---

interface ChecklistItem {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  itemType: ChecklistItemType;
  isRequired: boolean;
  sortOrder: number;
}

interface ChecklistSection {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  items: ChecklistItem[];
}

interface ChecklistTemplate {
  id: string;
  title: string;
  description: string | null;
  isDefault: boolean;
  isMaster: boolean;
  sourceTemplateId: string | null;
  sections: ChecklistSection[];
}

interface ChecklistInstanceData {
  id: string;
  templateId: string;
  startedAt: string;
  completedAt: string | null;
  template: { id: string; title: string };
  project: { id: string; projectNumber: string; clientName: string };
  totalItems: number;
  completedItems: number;
  percentage: number;
}

interface ProjectOption {
  id: string;
  projectNumber: string;
  clientName: string;
}

interface SectionFormData {
  title: string;
  description: string;
}

interface ItemFormData {
  title: string;
  description: string;
  itemType: ChecklistItemType;
  isRequired: boolean;
}

const emptySectionForm: SectionFormData = { title: "", description: "" };
const emptyItemForm: ItemFormData = {
  title: "",
  description: "",
  itemType: "CHECKBOX",
  isRequired: true,
};

const ITEM_TYPE_COLORS: Record<ChecklistItemType, string> = {
  CHECKBOX: "bg-slate-100 text-slate-700",
  TEXT_INPUT: "bg-blue-100 text-blue-700",
  PHOTO_REQUIRED: "bg-amber-100 text-amber-700",
  SIGNATURE: "bg-purple-100 text-purple-700",
};

export default function ChecklistsPage() {
  const [masterTemplates, setMasterTemplates] = useState<ChecklistTemplate[]>(
    []
  );
  const [orgTemplates, setOrgTemplates] = useState<ChecklistTemplate[]>([]);
  const [instances, setInstances] = useState<ChecklistInstanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"templates" | "checklists">(
    "templates"
  );

  // Template expand/collapse
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(
    new Set()
  );

  // Section form
  const [addingSectionFor, setAddingSectionFor] = useState<string | null>(null);
  const [sectionForm, setSectionForm] =
    useState<SectionFormData>(emptySectionForm);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Item form
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>(emptyItemForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Start checklist dialog
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [starting, setStarting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/checklists");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/onboarding";
          return;
        }
        throw new Error("Failed to fetch checklists");
      }
      const data = await response.json();
      setMasterTemplates(data.masterTemplates || []);
      setOrgTemplates(data.orgTemplates || []);
      setInstances(data.instances || []);
    } catch (err) {
      console.error("Failed to fetch checklists:", err);
      setError("Failed to load checklists.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  function toggleExpand(id: string) {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---- Clone Master Template ----

  async function handleClone(templateId: string) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clone", templateId }),
      });

      if (response.ok) {
        showSuccess("Template cloned successfully. You can now customise it.");
        setLoading(true);
        await fetchData();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to clone template.");
      }
    } catch (err) {
      console.error("Failed to clone template:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ---- Reset (delete) org template ----

  async function handleResetTemplate(templateId: string) {
    const confirmed = window.confirm(
      "Reset your company checklist to default? This will delete your customised template and all its sections/items. Active checklist instances will not be affected.\n\nYou can re-clone the master template afterwards."
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/checklists?action=delete-template&templateId=${templateId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        showSuccess("Company template reset. You can clone a new one.");
        setLoading(true);
        await fetchData();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to reset template.");
      }
    } catch (err) {
      console.error("Failed to reset template:", err);
      setError("An error occurred. Please try again.");
    }
  }

  // ---- Section CRUD ----

  function openAddSection(templateId: string) {
    setAddingSectionFor(templateId);
    setSectionForm(emptySectionForm);
    setEditingSectionId(null);
    setError(null);
  }

  function openEditSection(section: ChecklistSection) {
    setAddingSectionFor(section.templateId);
    setSectionForm({
      title: section.title,
      description: section.description || "",
    });
    setEditingSectionId(section.id);
    setError(null);
  }

  function cancelSectionForm() {
    setAddingSectionFor(null);
    setEditingSectionId(null);
    setSectionForm(emptySectionForm);
    setError(null);
  }

  async function handleSaveSection(templateId: string) {
    setError(null);
    if (!sectionForm.title.trim()) {
      setError("Section title is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingSectionId) {
        const response = await fetch("/api/checklists", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-section",
            sectionId: editingSectionId,
            title: sectionForm.title.trim(),
            description: sectionForm.description.trim() || null,
          }),
        });

        if (response.ok) {
          showSuccess("Section updated.");
          cancelSectionForm();
          setLoading(true);
          await fetchData();
        } else {
          const data = await response.json();
          setError(data.error || "Failed to update section.");
        }
      } else {
        const response = await fetch("/api/checklists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-section",
            templateId,
            title: sectionForm.title.trim(),
            description: sectionForm.description.trim() || undefined,
          }),
        });

        if (response.ok) {
          showSuccess("Section added.");
          cancelSectionForm();
          setLoading(true);
          await fetchData();
        } else {
          const data = await response.json();
          setError(data.error || "Failed to add section.");
        }
      }
    } catch (err) {
      console.error("Failed to save section:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSection(sectionId: string, sectionTitle: string) {
    const confirmed = window.confirm(
      `Delete section "${sectionTitle}" and all its items?`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/checklists?action=delete-section&sectionId=${sectionId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        showSuccess("Section deleted.");
        setLoading(true);
        await fetchData();
      } else {
        const data = await response.json();
        window.alert(data.error || "Failed to delete section.");
      }
    } catch (err) {
      console.error("Failed to delete section:", err);
      window.alert("An error occurred. Please try again.");
    }
  }

  // ---- Item CRUD ----

  function openAddItem(sectionId: string) {
    setAddingItemFor(sectionId);
    setItemForm(emptyItemForm);
    setEditingItemId(null);
    setError(null);
  }

  function openEditItem(item: ChecklistItem) {
    setAddingItemFor(item.sectionId);
    setItemForm({
      title: item.title,
      description: item.description || "",
      itemType: item.itemType,
      isRequired: item.isRequired,
    });
    setEditingItemId(item.id);
    setError(null);
  }

  function cancelItemForm() {
    setAddingItemFor(null);
    setEditingItemId(null);
    setItemForm(emptyItemForm);
    setError(null);
  }

  async function handleSaveItem(sectionId: string) {
    setError(null);
    if (!itemForm.title.trim()) {
      setError("Item title is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingItemId) {
        const response = await fetch("/api/checklists", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-item",
            itemId: editingItemId,
            title: itemForm.title.trim(),
            description: itemForm.description.trim() || null,
            itemType: itemForm.itemType,
            isRequired: itemForm.isRequired,
          }),
        });

        if (response.ok) {
          showSuccess("Item updated.");
          cancelItemForm();
          setLoading(true);
          await fetchData();
        } else {
          const data = await response.json();
          setError(data.error || "Failed to update item.");
        }
      } else {
        const response = await fetch("/api/checklists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-item",
            sectionId,
            title: itemForm.title.trim(),
            description: itemForm.description.trim() || undefined,
            itemType: itemForm.itemType,
            isRequired: itemForm.isRequired,
          }),
        });

        if (response.ok) {
          showSuccess("Item added.");
          cancelItemForm();
          setLoading(true);
          await fetchData();
        } else {
          const data = await response.json();
          setError(data.error || "Failed to add item.");
        }
      }
    } catch (err) {
      console.error("Failed to save item:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string, itemTitle: string) {
    const confirmed = window.confirm(`Delete item "${itemTitle}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/checklists?action=delete-item&itemId=${itemId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        showSuccess("Item deleted.");
        setLoading(true);
        await fetchData();
      } else {
        const data = await response.json();
        window.alert(data.error || "Failed to delete item.");
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
      window.alert("An error occurred. Please try again.");
    }
  }

  // ---- Start Checklist (Instance Creation) ----

  async function openStartDialog() {
    setShowStartDialog(true);
    setSelectedProjectId("");
    setSelectedTemplateId("");
    setError(null);

    // Fetch projects for selection
    setLoadingProjects(true);
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  }

  function closeStartDialog() {
    setShowStartDialog(false);
    setSelectedProjectId("");
    setSelectedTemplateId("");
    setError(null);
  }

  async function handleStartChecklist() {
    if (!selectedProjectId || !selectedTemplateId) {
      setError("Please select both a project and a template.");
      return;
    }

    setStarting(true);
    setError(null);
    try {
      const response = await fetch(`/api/checklists/${selectedTemplateId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          projectId: selectedProjectId,
        }),
      });

      if (response.ok) {
        showSuccess("Checklist started successfully.");
        closeStartDialog();
        setLoading(true);
        await fetchData();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to start checklist.");
      }
    } catch (err) {
      console.error("Failed to start checklist:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  // Get available templates for starting a checklist (org templates preferred, fallback to master)
  const availableTemplates =
    orgTemplates.length > 0 ? orgTemplates : masterTemplates;

  // ---- Render ----

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-[var(--ranz-charcoal)]" />
            Checklists
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your company checklist and track project progress
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 rounded w-1/3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-[var(--ranz-charcoal)]" />
          Checklists
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your company checklist template and track project checklists
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}
      {error && !showStartDialog && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "templates"
              ? "border-[var(--ranz-charcoal)] text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Templates
          {orgTemplates.length > 0 && (
            <span className="ml-1.5 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">
              {orgTemplates.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("checklists")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "checklists"
              ? "border-[var(--ranz-charcoal)] text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Project Checklists
          {instances.length > 0 && (
            <span className="ml-1.5 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">
              {instances.length}
            </span>
          )}
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Org Templates */}
          {orgTemplates.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  Your Company Template
                </h2>
              </div>
              {orgTemplates.map((template) => {
                const isExpanded = expandedTemplates.has(template.id);
                const sectionCount = template.sections.length;
                const itemCount = template.sections.reduce(
                  (sum, s) => sum + s.items.length,
                  0
                );

                return (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => toggleExpand(template.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">
                                {template.title}
                              </CardTitle>
                              <Badge className="bg-green-100 text-green-800">
                                Company
                              </Badge>
                            </div>
                            {template.description && (
                              <p className="text-sm text-slate-500 mt-1">
                                {template.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                              <span>
                                {sectionCount} section
                                {sectionCount !== 1 ? "s" : ""}
                              </span>
                              <span>
                                {itemCount} item{itemCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => handleResetTemplate(template.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Reset to Default
                        </Button>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="border-t pt-4 space-y-4">
                          {/* Sections */}
                          {template.sections.map((section) => (
                            <div
                              key={section.id}
                              className="border rounded-lg overflow-hidden"
                            >
                              {/* Section Header */}
                              <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-4 w-4 text-slate-300" />
                                  <span className="font-medium text-slate-700">
                                    {section.title}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    ({section.items.length} item
                                    {section.items.length !== 1 ? "s" : ""})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    onClick={() => openAddItem(section.id)}
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Item
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    onClick={() => openEditSection(section)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                      handleDeleteSection(
                                        section.id,
                                        section.title
                                      )
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Section Edit Form */}
                              {addingSectionFor === template.id &&
                                editingSectionId === section.id && (
                                  <div className="bg-yellow-50 border-b px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={sectionForm.title}
                                        onChange={(e) =>
                                          setSectionForm({
                                            ...sectionForm,
                                            title: e.target.value,
                                          })
                                        }
                                        placeholder="Section title"
                                        className="flex-1"
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleSaveSection(template.id)
                                        }
                                        disabled={saving}
                                      >
                                        {saving && (
                                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                        )}
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelSectionForm}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                )}

                              {/* Items */}
                              {section.items.length > 0 && (
                                <div className="divide-y">
                                  {section.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-sm text-slate-700 truncate">
                                          {item.title}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className={`text-xs shrink-0 ${ITEM_TYPE_COLORS[item.itemType]}`}
                                        >
                                          {
                                            CHECKLIST_ITEM_TYPE_LABELS[
                                              item.itemType
                                            ]
                                          }
                                        </Badge>
                                        {item.isRequired && (
                                          <span className="text-xs text-red-500 shrink-0">
                                            Required
                                          </span>
                                        )}
                                        {!item.isRequired && (
                                          <span className="text-xs text-slate-400 shrink-0">
                                            Optional
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2"
                                          onClick={() => openEditItem(item)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() =>
                                            handleDeleteItem(
                                              item.id,
                                              item.title
                                            )
                                          }
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add Item Form */}
                              {addingItemFor === section.id &&
                                !editingItemId && (
                                  <div className="bg-blue-50 border-t px-4 py-3">
                                    <div className="space-y-2">
                                      <Input
                                        value={itemForm.title}
                                        onChange={(e) =>
                                          setItemForm({
                                            ...itemForm,
                                            title: e.target.value,
                                          })
                                        }
                                        placeholder="Item title"
                                      />
                                      <div className="flex items-center gap-2">
                                        <select
                                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                                          value={itemForm.itemType}
                                          onChange={(e) =>
                                            setItemForm({
                                              ...itemForm,
                                              itemType: e.target
                                                .value as ChecklistItemType,
                                            })
                                          }
                                        >
                                          {Object.entries(
                                            CHECKLIST_ITEM_TYPE_LABELS
                                          ).map(([value, label]) => (
                                            <option key={value} value={value}>
                                              {label}
                                            </option>
                                          ))}
                                        </select>
                                        <label className="flex items-center gap-1.5 text-sm text-slate-600">
                                          <input
                                            type="checkbox"
                                            checked={itemForm.isRequired}
                                            onChange={(e) =>
                                              setItemForm({
                                                ...itemForm,
                                                isRequired: e.target.checked,
                                              })
                                            }
                                          />
                                          Required
                                        </label>
                                        <div className="flex-1" />
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            handleSaveItem(section.id)
                                          }
                                          disabled={saving}
                                        >
                                          {saving && (
                                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                          )}
                                          Add
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={cancelItemForm}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                              {/* Edit Item Form */}
                              {addingItemFor === section.id &&
                                editingItemId && (
                                  <div className="bg-yellow-50 border-t px-4 py-3">
                                    <div className="space-y-2">
                                      <Input
                                        value={itemForm.title}
                                        onChange={(e) =>
                                          setItemForm({
                                            ...itemForm,
                                            title: e.target.value,
                                          })
                                        }
                                        placeholder="Item title"
                                      />
                                      <div className="flex items-center gap-2">
                                        <select
                                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                                          value={itemForm.itemType}
                                          onChange={(e) =>
                                            setItemForm({
                                              ...itemForm,
                                              itemType: e.target
                                                .value as ChecklistItemType,
                                            })
                                          }
                                        >
                                          {Object.entries(
                                            CHECKLIST_ITEM_TYPE_LABELS
                                          ).map(([value, label]) => (
                                            <option key={value} value={value}>
                                              {label}
                                            </option>
                                          ))}
                                        </select>
                                        <label className="flex items-center gap-1.5 text-sm text-slate-600">
                                          <input
                                            type="checkbox"
                                            checked={itemForm.isRequired}
                                            onChange={(e) =>
                                              setItemForm({
                                                ...itemForm,
                                                isRequired: e.target.checked,
                                              })
                                            }
                                          />
                                          Required
                                        </label>
                                        <div className="flex-1" />
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            handleSaveItem(section.id)
                                          }
                                          disabled={saving}
                                        >
                                          {saving && (
                                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                          )}
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={cancelItemForm}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                            </div>
                          ))}

                          {/* Add Section Form */}
                          {addingSectionFor === template.id &&
                            !editingSectionId && (
                              <div className="border rounded-lg bg-green-50 px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={sectionForm.title}
                                    onChange={(e) =>
                                      setSectionForm({
                                        ...sectionForm,
                                        title: e.target.value,
                                      })
                                    }
                                    placeholder="New section title"
                                    className="flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleSaveSection(template.id)
                                    }
                                    disabled={saving}
                                  >
                                    {saving && (
                                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    )}
                                    Add
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelSectionForm}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )}

                          {/* Add Section Button */}
                          {addingSectionFor !== template.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-dashed"
                              onClick={() => openAddSection(template.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Section
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Available Templates
              </h2>
              <p className="text-sm text-slate-500">
                Clone a master template to create your company&apos;s customised
                checklist. You can add, remove, or reorder sections and items
                after cloning.
              </p>
              {masterTemplates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">
                      No master templates available. Contact your RANZ
                      administrator.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                masterTemplates.map((template) => {
                  const sectionCount = template.sections.length;
                  const itemCount = template.sections.reduce(
                    (sum, s) => sum + s.items.length,
                    0
                  );
                  const isExpanded = expandedTemplates.has(template.id);

                  return (
                    <Card key={template.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div
                            className="flex items-center gap-3 cursor-pointer flex-1"
                            onClick={() => toggleExpand(template.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">
                                  {template.title}
                                </CardTitle>
                                <Badge className="bg-blue-100 text-blue-800">
                                  Master
                                </Badge>
                              </div>
                              {template.description && (
                                <p className="text-sm text-slate-500 mt-1">
                                  {template.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                <span>
                                  {sectionCount} section
                                  {sectionCount !== 1 ? "s" : ""}
                                </span>
                                <span>
                                  {itemCount} item{itemCount !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleClone(template.id)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Copy className="h-4 w-4 mr-1" />
                            )}
                            Use This Template
                          </Button>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="pt-0">
                          <div className="border-t pt-4 space-y-3">
                            {template.sections.map((section) => (
                              <div
                                key={section.id}
                                className="border rounded-lg overflow-hidden"
                              >
                                <div className="bg-slate-50 px-4 py-2.5">
                                  <span className="font-medium text-slate-700 text-sm">
                                    {section.title}
                                  </span>
                                  <span className="text-xs text-slate-400 ml-2">
                                    ({section.items.length} item
                                    {section.items.length !== 1 ? "s" : ""})
                                  </span>
                                </div>
                                {section.items.length > 0 && (
                                  <div className="divide-y">
                                    {section.items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="px-4 py-2 flex items-center gap-3"
                                      >
                                        <span className="text-sm text-slate-600">
                                          {item.title}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className={`text-xs ${ITEM_TYPE_COLORS[item.itemType]}`}
                                        >
                                          {
                                            CHECKLIST_ITEM_TYPE_LABELS[
                                              item.itemType
                                            ]
                                          }
                                        </Badge>
                                        {item.isRequired && (
                                          <span className="text-xs text-red-500">
                                            Required
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Project Checklists Tab */}
      {activeTab === "checklists" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Project Checklists
            </h2>
            <Button onClick={openStartDialog} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Start Checklist
            </Button>
          </div>

          {/* Start Checklist Dialog */}
          {showStartDialog && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Start New Checklist
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={closeStartDialog}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Project
                    </label>
                    {loadingProjects ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading projects...
                      </div>
                    ) : projects.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No projects found.{" "}
                        <Link
                          href="/projects"
                          className="text-blue-600 hover:underline"
                        >
                          Create a project
                        </Link>{" "}
                        first.
                      </p>
                    ) : (
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                      >
                        <option value="">Select a project...</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.projectNumber} - {p.clientName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Template
                    </label>
                    {availableTemplates.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No templates available. Clone a master template first.
                      </p>
                    ) : (
                      <select
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                      >
                        <option value="">Select a template...</option>
                        {availableTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} ({t.sections.length} sections)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={closeStartDialog}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleStartChecklist}
                      disabled={
                        starting ||
                        !selectedProjectId ||
                        !selectedTemplateId
                      }
                    >
                      {starting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        "Start Checklist"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instances List */}
          {instances.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  No project checklists yet. Start one using the button above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {instances.map((instance) => (
                <Link
                  key={instance.id}
                  href={`/checklists/${instance.id}`}
                  className="block"
                >
                  <Card className="hover:border-slate-400 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">
                              {instance.project.projectNumber} -{" "}
                              {instance.project.clientName}
                            </h3>
                            {instance.completedAt && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            {instance.template.title}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>
                              Started{" "}
                              {new Date(
                                instance.startedAt
                              ).toLocaleDateString()}
                            </span>
                            {instance.completedAt && (
                              <span>
                                Completed{" "}
                                {new Date(
                                  instance.completedAt
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 ml-4">
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900">
                              {instance.percentage}%
                            </div>
                            <div className="text-xs text-slate-400">
                              {instance.completedItems}/{instance.totalItems}{" "}
                              items
                            </div>
                          </div>
                          <div className="w-16 h-16">
                            <svg
                              viewBox="0 0 36 36"
                              className="w-full h-full -rotate-90"
                            >
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#e2e8f0"
                                strokeWidth="3"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={
                                  instance.percentage === 100
                                    ? "#22c55e"
                                    : instance.percentage >= 50
                                      ? "#3b82f6"
                                      : "#94a3b8"
                                }
                                strokeWidth="3"
                                strokeDasharray={`${instance.percentage}, 100`}
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
