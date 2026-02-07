"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Award, Loader2, X } from "lucide-react";
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

const QUALIFICATION_TYPE_LABELS: Record<string, string> = {
  NZQA: "NZQA",
  MANUFACTURER_CERT: "Manufacturer Certification",
  SAFETY: "Safety",
  FIRST_AID: "First Aid",
  SITE_SAFE: "Site Safe",
  OTHER: "Other",
};

interface Qualification {
  id: string;
  type: string;
  title: string;
  issuingBody: string;
  issueDate: string;
  expiryDate: string | null;
  verified: boolean;
}

interface QualificationsListProps {
  memberId: string;
}

export function QualificationsList({ memberId }: QualificationsListProps) {
  const router = useRouter();
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: "",
    title: "",
    issuingBody: "",
    issueDate: "",
    expiryDate: "",
  });

  const fetchQualifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/staff/${memberId}/qualifications`);
      if (!res.ok) throw new Error("Failed to fetch qualifications");
      const data = await res.json();
      setQualifications(data);
    } catch (err) {
      console.error("Failed to fetch qualifications:", err);
      setError("Failed to load qualifications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQualifications();
  }, [memberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/staff/${memberId}/qualifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          expiryDate: formData.expiryDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add qualification");
      }

      setFormData({
        type: "",
        title: "",
        issuingBody: "",
        issueDate: "",
        expiryDate: "",
      });
      setShowForm(false);
      await fetchQualifications();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add qualification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpired = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
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
        <span className="ml-2 text-sm text-slate-500">Loading qualifications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-900">Qualifications</h3>
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
              Add Qualification
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
              <Label htmlFor="qual-type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUALIFICATION_TYPE_LABELS).map(
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
              <Label htmlFor="qual-title">Title *</Label>
              <Input
                id="qual-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g. NZ Certificate in Roofing Level 4"
                required
              />
            </div>

            <div>
              <Label htmlFor="qual-issuing-body">Issuing Body *</Label>
              <Input
                id="qual-issuing-body"
                value={formData.issuingBody}
                onChange={(e) =>
                  setFormData({ ...formData, issuingBody: e.target.value })
                }
                placeholder="e.g. NZQA, Site Safe"
                required
              />
            </div>

            <div>
              <Label htmlFor="qual-issue-date">Issue Date *</Label>
              <Input
                id="qual-issue-date"
                type="date"
                value={formData.issueDate}
                onChange={(e) =>
                  setFormData({ ...formData, issueDate: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="qual-expiry-date">Expiry Date</Label>
              <Input
                id="qual-expiry-date"
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
              />
              <p className="text-xs text-slate-500 mt-1">
                Leave blank if no expiry
              </p>
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
              disabled={isSubmitting || !formData.type}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Qualification"
              )}
            </Button>
          </div>
        </form>
      )}

      {qualifications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center">
          <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No qualifications recorded</p>
          {!showForm && (
            <Button
              size="sm"
              variant="link"
              className="mt-1"
              onClick={() => setShowForm(true)}
            >
              Add the first qualification
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {qualifications.map((qual) => (
            <div
              key={qual.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Award className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-medium text-slate-900">
                        {qual.title}
                      </h4>
                      <Badge variant="secondary">
                        {QUALIFICATION_TYPE_LABELS[qual.type] || qual.type}
                      </Badge>
                      {qual.verified && (
                        <Badge variant="success">Verified</Badge>
                      )}
                      {isExpired(qual.expiryDate) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {qual.issuingBody}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>Issued: {formatDate(qual.issueDate)}</span>
                      {qual.expiryDate && (
                        <span
                          className={
                            isExpired(qual.expiryDate)
                              ? "text-red-500"
                              : undefined
                          }
                        >
                          Expires: {formatDate(qual.expiryDate)}
                        </span>
                      )}
                    </div>
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
