"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHECKLIST_ITEM_TYPE_LABELS } from "@/types";
import type { ChecklistItemType } from "@/types";

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
  createdAt: string;
  sections: ChecklistSection[];
  _count: {
    instances: number;
  };
}

interface TemplateFormData {
  title: string;
  description: string;
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

const emptyTemplateForm: TemplateFormData = { title: "", description: "" };
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

export default function AdminChecklistsPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Template form state
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormData>(emptyTemplateForm);
  const [saving, setSaving] = useState(false);

  // Expand/collapse state
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  // Section form state
  const [addingSectionFor, setAddingSectionFor] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormData>(emptySectionForm);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Item form state
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>(emptyItemForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  async function fetchTemplates() {
    try {
      const response = await fetch("/api/admin/checklists");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        setError("Failed to fetch checklists");
      }
    } catch (err) {
      console.error("Failed to fetch checklists:", err);
      setError("Failed to fetch checklists");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  function toggleExpand(id: string) {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ---- Template CRUD ----

  function openCreateTemplate() {
    setTemplateForm(emptyTemplateForm);
    setEditingTemplateId(null);
    setShowTemplateForm(true);
    setError(null);
  }

  function openEditTemplate(t: ChecklistTemplate) {
    setTemplateForm({
      title: t.title,
      description: t.description || "",
    });
    setEditingTemplateId(t.id);
    setShowTemplateForm(true);
    setError(null);
  }

  function cancelTemplateForm() {
    setShowTemplateForm(false);
    setEditingTemplateId(null);
    setTemplateForm(emptyTemplateForm);
    setError(null);
  }

  async function handleSaveTemplate() {
    setError(null);
    if (templateForm.title.length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: templateForm.title.trim(),
        description: templateForm.description.trim() || undefined,
      };

      const url = editingTemplateId
        ? `/api/admin/checklists/${editingTemplateId}`
        : "/api/admin/checklists";

      const response = await fetch(url, {
        method: editingTemplateId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showSuccess(
          editingTemplateId
            ? "Template updated successfully."
            : "Template created successfully."
        );
        cancelTemplateForm();
        setLoading(true);
        await fetchTemplates();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save template.");
      }
    } catch (err) {
      console.error("Failed to save template:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(t: ChecklistTemplate) {
    if (t.isDefault) {
      window.alert(
        "Default checklist templates cannot be deleted. This is a core RoofWright template."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete checklist template "${t.title}"?\n\nThis will also delete all sections and items. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/checklists/${t.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showSuccess("Template deleted successfully.");
        setLoading(true);
        await fetchTemplates();
      } else {
        const data = await response.json();
        window.alert(data.error || "Failed to delete template.");
      }
    } catch (err) {
      console.error("Failed to delete template:", err);
      window.alert("An error occurred. Please try again.");
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
      const url = `/api/admin/checklists/${templateId}/sections`;

      if (editingSectionId) {
        const response = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: editingSectionId,
            title: sectionForm.title.trim(),
            description: sectionForm.description.trim() || null,
          }),
        });

        if (response.ok) {
          showSuccess("Section updated.");
          cancelSectionForm();
          setLoading(true);
          await fetchTemplates();
        } else {
          const data = await response.json();
          setError(data.error || "Failed to update section.");
        }
      } else {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: sectionForm.title.trim(),
            description: sectionForm.description.trim() || undefined,
          }),
        });

        if (response.ok) {
          showSuccess("Section added.");
          cancelSectionForm();
          setLoading(true);
          await fetchTemplates();
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

  async function handleDeleteSection(templateId: string, sectionId: string, sectionTitle: string) {
    const confirmed = window.confirm(
      `Delete section "${sectionTitle}" and all its items?`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/checklists/${templateId}/sections?sectionId=${sectionId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        showSuccess("Section deleted.");
        setLoading(true);
        await fetchTemplates();
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

  async function handleSaveItem(templateId: string, sectionId: string) {
    setError(null);
    if (!itemForm.title.trim()) {
      setError("Item title is required.");
      return;
    }

    setSaving(true);
    try {
      const url = `/api/admin/checklists/${templateId}/sections/${sectionId}/items`;

      if (editingItemId) {
        const response = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
          await fetchTemplates();
        } else {
          const data = await response.json();
          setError(data.error || "Failed to update item.");
        }
      } else {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
          await fetchTemplates();
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

  async function handleDeleteItem(
    templateId: string,
    sectionId: string,
    itemId: string,
    itemTitle: string
  ) {
    const confirmed = window.confirm(`Delete item "${itemTitle}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/checklists/${templateId}/sections/${sectionId}/items?itemId=${itemId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        showSuccess("Item deleted.");
        setLoading(true);
        await fetchTemplates();
      } else {
        const data = await response.json();
        window.alert(data.error || "Failed to delete item.");
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
      window.alert("An error occurred. Please try again.");
    }
  }

  // ---- Render ----

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

  const totalItems = templates.reduce(
    (sum, t) => sum + t.sections.reduce((s, sec) => s + sec.items.length, 0),
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Checklists</h1>
            <p className="text-slate-500">
              {templates.length} template{templates.length !== 1 ? "s" : ""},{" "}
              {totalItems} total items
            </p>
          </div>
        </div>
        {!showTemplateForm && (
          <Button onClick={openCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        )}
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

      {/* Template Create/Edit Form */}
      {showTemplateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTemplateId ? "Edit Template" : "New Checklist Template"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title *
                </label>
                <Input
                  value={templateForm.title}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, title: e.target.value })
                  }
                  placeholder="e.g., Commercial Roofing Process Checklist"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={templateForm.description}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description of this checklist template..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={cancelTemplateForm}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate} disabled={saving}>
                  {saving && (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  )}
                  {editingTemplateId ? "Save Changes" : "Create"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No checklist templates found.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => {
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
                          {template.isDefault && (
                            <Badge className="bg-blue-100 text-blue-800">
                              Default
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-slate-500 mt-1">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span>
                            {sectionCount} section{sectionCount !== 1 ? "s" : ""}
                          </span>
                          <span>
                            {itemCount} item{itemCount !== 1 ? "s" : ""}
                          </span>
                          <span>
                            {template._count.instances} instance
                            {template._count.instances !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditTemplate(template)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-700 border-red-300 hover:bg-red-50"
                        disabled={template.isDefault}
                        onClick={() => handleDeleteTemplate(template)}
                        title={
                          template.isDefault
                            ? "Default templates cannot be deleted"
                            : "Delete template"
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
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
                                    template.id,
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
                                      {CHECKLIST_ITEM_TYPE_LABELS[item.itemType]}
                                    </Badge>
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
                                          template.id,
                                          section.id,
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
                          {addingItemFor === section.id && !editingItemId && (
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
                                      handleSaveItem(template.id, section.id)
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
                          {addingItemFor === section.id && editingItemId && (
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
                                      handleSaveItem(template.id, section.id)
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
      )}
    </div>
  );
}
