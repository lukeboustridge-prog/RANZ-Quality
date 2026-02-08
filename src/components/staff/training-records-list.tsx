"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, Loader2, X, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const CPD_CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: "Technical",
  PEER_REVIEW: "Peer Review",
  INDUSTRY_EVENT: "Industry Event",
  SELF_STUDY: "Self Study",
  OTHER: "Other",
};

const CPD_CATEGORY_COLORS: Record<string, string> = {
  TECHNICAL: "bg-blue-100 text-blue-800",
  PEER_REVIEW: "bg-purple-100 text-purple-800",
  INDUSTRY_EVENT: "bg-green-100 text-green-800",
  SELF_STUDY: "bg-amber-100 text-amber-800",
  OTHER: "bg-slate-100 text-slate-800",
};

interface TrainingRecord {
  id: string;
  courseName: string;
  provider: string;
  completedAt: string;
  cpdPoints: number;
  cpdCategory: string;
  certificateKey: string | null;
  notes: string | null;
}

interface TrainingRecordsListProps {
  memberId: string;
}

const EMPTY_FORM = {
  courseName: "",
  provider: "",
  completedAt: "",
  cpdPoints: "",
  cpdCategory: "",
  notes: "",
};

export function TrainingRecordsList({ memberId }: TrainingRecordsListProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/staff/${memberId}/training`);
      if (!res.ok) throw new Error("Failed to fetch training records");
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error("Failed to fetch training records:", err);
      setError("Failed to load training records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [memberId]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setCertificateFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (record: TrainingRecord) => {
    setFormData({
      courseName: record.courseName,
      provider: record.provider,
      completedAt: record.completedAt.split("T")[0],
      cpdPoints: String(record.cpdPoints),
      cpdCategory: record.cpdCategory,
      notes: record.notes || "",
    });
    setCertificateFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setEditingId(record.id);
    setShowForm(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("courseName", formData.courseName);
      fd.append("provider", formData.provider);
      fd.append("completedAt", formData.completedAt);
      fd.append("cpdPoints", formData.cpdPoints);
      fd.append("cpdCategory", formData.cpdCategory);
      if (formData.notes) fd.append("notes", formData.notes);
      if (certificateFile) fd.append("certificate", certificateFile);

      const url = editingId
        ? `/api/staff/${memberId}/training/${editingId}`
        : `/api/staff/${memberId}/training`;

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save training record");
      }

      resetForm();
      await fetchRecords();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save training record"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this training record?")) return;

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(
        `/api/staff/${memberId}/training/${id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete training record");
      }

      await fetchRecords();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete training record"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">
          Loading training records...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-900">Training Records</h3>
        <Button
          size="sm"
          variant={showForm ? "ghost" : "outline"}
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setEditingId(null);
              setFormData(EMPTY_FORM);
              setCertificateFile(null);
              setShowForm(true);
            }
          }}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add Training Record
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4"
        >
          <div className="text-sm font-medium text-slate-700 mb-2">
            {editingId ? "Edit Training Record" : "New Training Record"}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="training-course">Course Name *</Label>
              <Input
                id="training-course"
                value={formData.courseName}
                onChange={(e) =>
                  setFormData({ ...formData, courseName: e.target.value })
                }
                placeholder="e.g. Advanced Membrane Roofing"
                required
              />
            </div>

            <div>
              <Label htmlFor="training-provider">Provider *</Label>
              <Input
                id="training-provider"
                value={formData.provider}
                onChange={(e) =>
                  setFormData({ ...formData, provider: e.target.value })
                }
                placeholder="e.g. Vertical Horizonz, RANZ"
                required
              />
            </div>

            <div>
              <Label htmlFor="training-date">Completion Date *</Label>
              <Input
                id="training-date"
                type="date"
                value={formData.completedAt}
                onChange={(e) =>
                  setFormData({ ...formData, completedAt: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="training-points">CPD Points *</Label>
              <Input
                id="training-points"
                type="number"
                min="0"
                step="0.5"
                value={formData.cpdPoints}
                onChange={(e) =>
                  setFormData({ ...formData, cpdPoints: e.target.value })
                }
                placeholder="e.g. 5"
                required
              />
            </div>

            <div>
              <Label htmlFor="training-category">CPD Category *</Label>
              <Select
                value={formData.cpdCategory}
                onValueChange={(value) =>
                  setFormData({ ...formData, cpdCategory: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CPD_CATEGORY_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="training-certificate">Certificate</Label>
              <Input
                id="training-certificate"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                PDF or image, max 50 MB
              </p>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="training-notes">Notes</Label>
              <Textarea
                id="training-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes about this training..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !formData.cpdCategory}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {editingId ? "Saving..." : "Adding..."}
                </>
              ) : editingId ? (
                "Save Changes"
              ) : (
                "Add Training Record"
              )}
            </Button>
          </div>
        </form>
      )}

      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center">
          <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No training records</p>
          {!showForm && (
            <Button
              size="sm"
              variant="link"
              className="mt-1"
              onClick={() => setShowForm(true)}
            >
              Add the first training record
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-medium text-slate-900">
                        {record.courseName}
                      </h4>
                      <Badge
                        className={
                          CPD_CATEGORY_COLORS[record.cpdCategory] ||
                          CPD_CATEGORY_COLORS.OTHER
                        }
                      >
                        {CPD_CATEGORY_LABELS[record.cpdCategory] ||
                          record.cpdCategory}
                      </Badge>
                      {record.certificateKey && (
                        <Badge variant="outline" className="gap-1">
                          <FileText className="h-3 w-3" />
                          Certificate
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {record.provider}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>Completed: {formatDate(record.completedAt)}</span>
                      <span className="font-medium text-slate-600">
                        {record.cpdPoints} CPD point
                        {record.cpdPoints !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {record.notes && (
                      <p className="text-xs text-slate-400 mt-2 italic">
                        {record.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(record)}
                    disabled={!!deletingId}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(record.id)}
                    disabled={deletingId === record.id}
                  >
                    {deletingId === record.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
