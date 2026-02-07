"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, Loader2, X } from "lucide-react";
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
  notes: string | null;
}

interface TrainingRecordsListProps {
  memberId: string;
}

export function TrainingRecordsList({ memberId }: TrainingRecordsListProps) {
  const router = useRouter();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    courseName: "",
    provider: "",
    completedAt: "",
    cpdPoints: "",
    cpdCategory: "",
    notes: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/staff/${memberId}/training`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          cpdPoints: Number(formData.cpdPoints),
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add training record");
      }

      setFormData({
        courseName: "",
        provider: "",
        completedAt: "",
        cpdPoints: "",
        cpdCategory: "",
        notes: "",
      });
      setShowForm(false);
      await fetchRecords();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add training record"
      );
    } finally {
      setIsSubmitting(false);
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
          onClick={() => setShowForm(!showForm)}
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
              onClick={() => setShowForm(false)}
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
                  Adding...
                </>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
