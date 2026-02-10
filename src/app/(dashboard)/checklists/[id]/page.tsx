"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Camera,
  PenLine,
  StickyNote,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHECKLIST_ITEM_TYPE_LABELS } from "@/types";
import type { ChecklistItemType } from "@/types";

// --- Interfaces ---

interface CompletionData {
  id: string;
  completed: boolean;
  textValue: string | null;
  notes: string | null;
  photoKey: string | null;
  photoFileName: string | null;
  completedAt: string | null;
  completedBy: string | null;
}

interface ChecklistItemData {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  itemType: ChecklistItemType;
  isRequired: boolean;
  sortOrder: number;
  completion: CompletionData | null;
}

interface SectionData {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  items: ChecklistItemData[];
}

interface InstanceData {
  id: string;
  templateId: string;
  projectId: string;
  organizationId: string;
  startedAt: string;
  completedAt: string | null;
  createdBy: string;
}

interface StatsData {
  totalItems: number;
  completedItems: number;
  requiredItems: number;
  completedRequired: number;
  percentage: number;
}

interface ChecklistDetail {
  instance: InstanceData;
  template: { id: string; title: string; description: string | null };
  project: {
    id: string;
    projectNumber: string;
    clientName: string;
    siteAddress: string;
  };
  sections: SectionData[];
  stats: StatsData;
}

export default function ChecklistDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<ChecklistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // itemId being saved
  const [completingAll, setCompletingAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Section expand/collapse (all expanded by default)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );

  // Notes expansion
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Debounce timers for text/notes
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/checklists/${id}`);
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/onboarding";
          return;
        }
        throw new Error("Failed to fetch checklist");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Failed to fetch checklist:", err);
      setError("Failed to load checklist.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  function toggleSection(sectionId: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function toggleNotes(itemId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  // --- Item completion toggle ---

  async function handleToggleCompletion(itemId: string, completed: boolean) {
    if (!data) return;

    setSaving(itemId);
    try {
      const response = await fetch(`/api/checklists/${id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update local state optimistically
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            instance: {
              ...prev.instance,
              completedAt: result.stats.completedRequired === result.stats.requiredItems
                ? new Date().toISOString()
                : null,
            },
            sections: prev.sections.map((section) => ({
              ...section,
              items: section.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      completion: {
                        ...(item.completion || {
                          id: result.completion.id,
                          textValue: null,
                          notes: null,
                          photoKey: null,
                          photoFileName: null,
                        }),
                        id: result.completion.id,
                        completed: result.completion.completed,
                        completedAt: result.completion.completedAt,
                        completedBy: result.completion.completedBy,
                      } as CompletionData,
                    }
                  : item
              ),
            })),
            stats: result.stats,
          };
        });
      } else {
        const errData = await response.json();
        setError(errData.error || "Failed to update item.");
      }
    } catch (err) {
      console.error("Failed to toggle completion:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  // --- Text value save (debounced) ---

  function handleTextChange(itemId: string, textValue: string) {
    // Update local state immediately
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          items: section.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  completion: {
                    ...(item.completion || {
                      id: "",
                      completed: false,
                      completedAt: null,
                      completedBy: null,
                      notes: null,
                      photoKey: null,
                      photoFileName: null,
                    }),
                    textValue,
                  } as CompletionData,
                }
              : item
          ),
        })),
      };
    });

    // Debounce the API save
    const existingTimer = debounceTimers.current.get(`text-${itemId}`);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/checklists/${id}/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textValue }),
        });
      } catch (err) {
        console.error("Failed to save text value:", err);
      }
    }, 1000);

    debounceTimers.current.set(`text-${itemId}`, timer);
  }

  // --- Notes save (on blur) ---

  async function handleNotesSave(itemId: string, notes: string) {
    try {
      await fetch(`/api/checklists/${id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    } catch (err) {
      console.error("Failed to save notes:", err);
    }
  }

  function handleNotesChange(itemId: string, notes: string) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          items: section.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  completion: {
                    ...(item.completion || {
                      id: "",
                      completed: false,
                      completedAt: null,
                      completedBy: null,
                      textValue: null,
                      photoKey: null,
                      photoFileName: null,
                    }),
                    notes,
                  } as CompletionData,
                }
              : item
          ),
        })),
      };
    });
  }

  // --- Mark checklist complete ---

  async function handleMarkComplete() {
    if (!data) return;

    setCompletingAll(true);
    setError(null);
    try {
      const response = await fetch(`/api/checklists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });

      if (response.ok) {
        showSuccess("Checklist marked as complete.");
        await fetchData();
      } else {
        const errData = await response.json();
        setError(errData.error || "Failed to complete checklist.");
      }
    } catch (err) {
      console.error("Failed to mark complete:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setCompletingAll(false);
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/checklists"
            className="text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Checklist</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-slate-200 rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/checklists"
            className="text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Checklist</h1>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { instance, template, project, sections, stats } = data;
  const allRequiredDone = stats.completedRequired === stats.requiredItems;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/checklists"
            className="text-slate-500 hover:text-slate-700 mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {project.projectNumber} - {project.clientName}
              </h1>
              {instance.completedAt && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed on{" "}
                  {new Date(instance.completedAt).toLocaleDateString()}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">{template.title}</p>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
              <span>{project.siteAddress}</span>
              <span>
                Started {new Date(instance.startedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Progress
            </span>
            <span className="text-sm text-slate-500">
              {stats.completedItems}/{stats.totalItems} items ({stats.percentage}
              %)
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                stats.percentage === 100
                  ? "bg-green-500"
                  : stats.percentage >= 50
                    ? "bg-blue-500"
                    : "bg-slate-400"
              }`}
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
            <span>
              Required: {stats.completedRequired}/{stats.requiredItems}
            </span>
            {allRequiredDone && !instance.completedAt && (
              <span className="text-green-600 font-medium">
                All required items complete
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {successMessage}
        </div>
      )}
      {error && (
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

      {/* Sections */}
      {sections.map((section) => {
        const isCollapsed = collapsedSections.has(section.id);
        const sectionCompleted = section.items.filter(
          (i) => i.completion?.completed
        ).length;
        const sectionTotal = section.items.length;

        return (
          <Card key={section.id}>
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">
                  {sectionCompleted}/{sectionTotal}
                </Badge>
              </div>
              {section.description && (
                <p className="text-sm text-slate-500 ml-7">
                  {section.description}
                </p>
              )}
            </CardHeader>

            {!isCollapsed && (
              <CardContent className="pt-0">
                <div className="divide-y">
                  {section.items.map((item) => {
                    const isComplete = item.completion?.completed || false;
                    const isSaving = saving === item.id;
                    const notesExpanded = expandedNotes.has(item.id);

                    return (
                      <div key={item.id} className="py-3 first:pt-0">
                        <div className="flex items-start gap-3">
                          {/* Checkbox / Type indicator */}
                          <div className="pt-0.5 shrink-0">
                            {item.itemType === "CHECKBOX" ||
                            item.itemType === "SIGNATURE" ? (
                              <button
                                onClick={() =>
                                  handleToggleCompletion(item.id, !isComplete)
                                }
                                disabled={isSaving}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isComplete
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-slate-300 hover:border-slate-400"
                                }`}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : isComplete ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : null}
                              </button>
                            ) : item.itemType === "TEXT_INPUT" ? (
                              <PenLine className="h-5 w-5 text-blue-500" />
                            ) : item.itemType === "PHOTO_REQUIRED" ? (
                              <Camera className="h-5 w-5 text-amber-500" />
                            ) : null}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  isComplete
                                    ? "text-slate-400 line-through"
                                    : "text-slate-800"
                                }`}
                              >
                                {item.title}
                              </span>
                              {item.isRequired && (
                                <span className="text-xs text-red-500 font-medium">
                                  Required
                                </span>
                              )}
                              {item.itemType === "SIGNATURE" && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-purple-50 text-purple-700"
                                >
                                  {CHECKLIST_ITEM_TYPE_LABELS[item.itemType]}
                                </Badge>
                              )}
                              {item.itemType === "PHOTO_REQUIRED" && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-amber-50 text-amber-700"
                                >
                                  Photo (coming soon)
                                </Badge>
                              )}
                            </div>

                            {item.description && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {item.description}
                              </p>
                            )}

                            {/* TEXT_INPUT type: editable text field */}
                            {item.itemType === "TEXT_INPUT" && (
                              <div className="mt-2">
                                <input
                                  type="text"
                                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                  placeholder="Enter value..."
                                  value={item.completion?.textValue || ""}
                                  onChange={(e) =>
                                    handleTextChange(item.id, e.target.value)
                                  }
                                  onBlur={(e) => {
                                    // Also mark as completed if there's a value
                                    if (
                                      e.target.value &&
                                      !item.completion?.completed
                                    ) {
                                      handleToggleCompletion(item.id, true);
                                    }
                                  }}
                                />
                              </div>
                            )}

                            {/* Notes */}
                            <div className="mt-1">
                              <button
                                onClick={() => toggleNotes(item.id)}
                                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                              >
                                <StickyNote className="h-3 w-3" />
                                {item.completion?.notes
                                  ? "Edit notes"
                                  : "Add notes"}
                              </button>
                              {notesExpanded && (
                                <textarea
                                  className="w-full mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                                  rows={2}
                                  placeholder="Notes..."
                                  value={item.completion?.notes || ""}
                                  onChange={(e) =>
                                    handleNotesChange(item.id, e.target.value)
                                  }
                                  onBlur={(e) =>
                                    handleNotesSave(item.id, e.target.value)
                                  }
                                />
                              )}
                            </div>

                            {/* Completion info */}
                            {isComplete && item.completion?.completedAt && (
                              <div className="mt-1 text-xs text-slate-400">
                                Completed{" "}
                                {new Date(
                                  item.completion.completedAt
                                ).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Mark Complete Button */}
      <div className="flex items-center justify-between py-4 border-t">
        <div className="text-sm text-slate-500">
          {allRequiredDone
            ? "All required items are complete."
            : `${stats.requiredItems - stats.completedRequired} required item(s) remaining.`}
        </div>
        {!instance.completedAt && (
          <Button
            onClick={handleMarkComplete}
            disabled={!allRequiredDone || completingAll}
            className={
              allRequiredDone
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }
          >
            {completingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4 mr-1" />
                Mark Complete
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
