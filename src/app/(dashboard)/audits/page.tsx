"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AUDIT_STATUS_LABELS,
  AUDIT_TYPE_LABELS,
  AUDIT_RATING_LABELS,
  type AuditStatus,
  type AuditType,
  type AuditRating,
} from "@/types";

interface Audit {
  id: string;
  auditNumber: string;
  auditType: AuditType;
  status: AuditStatus;
  scheduledDate: string;
  completedAt: string | null;
  auditorName: string | null;
  rating: AuditRating | null;
  _count: {
    checklist: number;
    capaRecords: number;
  };
}

const statusConfig: Record<
  AuditStatus,
  { color: string; icon: React.ReactNode }
> = {
  SCHEDULED: {
    color: "bg-blue-100 text-blue-700",
    icon: <Calendar className="h-3 w-3" />,
  },
  IN_PROGRESS: {
    color: "bg-yellow-100 text-yellow-700",
    icon: <Clock className="h-3 w-3" />,
  },
  PENDING_REVIEW: {
    color: "bg-orange-100 text-orange-700",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  COMPLETED: {
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  CANCELLED: {
    color: "bg-slate-100 text-slate-500",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const ratingColors: Record<AuditRating, string> = {
  PASS: "bg-green-100 text-green-700",
  PASS_WITH_OBSERVATIONS: "bg-lime-100 text-lime-700",
  CONDITIONAL_PASS: "bg-yellow-100 text-yellow-700",
  FAIL: "bg-red-100 text-red-700",
};

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    async function fetchAudits() {
      try {
        const response = await fetch("/api/audits");
        if (response.ok) {
          const data = await response.json();
          setAudits(data);
        }
      } catch (error) {
        console.error("Failed to fetch audits:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAudits();
  }, []);

  const filteredAudits = audits.filter((audit) => {
    if (filter === "active") {
      return ["SCHEDULED", "IN_PROGRESS", "PENDING_REVIEW"].includes(
        audit.status
      );
    }
    if (filter === "completed") {
      return audit.status === "COMPLETED";
    }
    return true;
  });

  const stats = {
    total: audits.length,
    scheduled: audits.filter((a) => a.status === "SCHEDULED").length,
    inProgress: audits.filter((a) => a.status === "IN_PROGRESS").length,
    completed: audits.filter((a) => a.status === "COMPLETED").length,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audits</h1>
          <p className="text-slate-500">
            Manage certification and compliance audits
          </p>
        </div>
        <Link href="/audits/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Audit
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Audits</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.scheduled}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.inProgress}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("active")}
        >
          Active
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          Completed
        </Button>
      </div>

      {/* Audits List */}
      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAudits.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No audits found</p>
              <Link href="/audits/new">
                <Button variant="outline" className="mt-4">
                  Schedule Your First Audit
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAudits.map((audit) => {
                const statusCfg = statusConfig[audit.status];
                return (
                  <Link key={audit.id} href={`/audits/${audit.id}`}>
                    <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <ClipboardCheck className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {audit.auditNumber}
                              </span>
                              <Badge className={statusCfg.color}>
                                {statusCfg.icon}
                                <span className="ml-1">
                                  {AUDIT_STATUS_LABELS[audit.status]}
                                </span>
                              </Badge>
                              {audit.rating && (
                                <Badge className={ratingColors[audit.rating]}>
                                  {AUDIT_RATING_LABELS[audit.rating]}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                              {AUDIT_TYPE_LABELS[audit.auditType]} •{" "}
                              {format(
                                new Date(audit.scheduledDate),
                                "MMM d, yyyy"
                              )}
                              {audit.auditorName && ` • ${audit.auditorName}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-slate-500">
                          <p>{audit._count.checklist} questions</p>
                          {audit._count.capaRecords > 0 && (
                            <p className="text-orange-600">
                              {audit._count.capaRecords} CAPAs
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
