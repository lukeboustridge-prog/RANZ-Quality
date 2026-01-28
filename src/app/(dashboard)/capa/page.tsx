"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CAPA_STATUS_LABELS,
  FINDING_SEVERITY_LABELS,
  ISO_ELEMENT_LABELS,
  type CAPAStatus,
  type FindingSeverity,
  type ISOElement,
} from "@/types";

interface CAPA {
  id: string;
  capaNumber: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  status: CAPAStatus;
  isoElement: ISOElement | null;
  dueDate: string;
  closedDate: string | null;
  assignedToName: string | null;
  audit: {
    auditNumber: string;
  } | null;
}

const statusConfig: Record<
  CAPAStatus,
  { color: string; icon: React.ReactNode }
> = {
  OPEN: {
    color: "bg-blue-100 text-blue-700",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  IN_PROGRESS: {
    color: "bg-yellow-100 text-yellow-700",
    icon: <Clock className="h-3 w-3" />,
  },
  PENDING_VERIFICATION: {
    color: "bg-purple-100 text-purple-700",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  CLOSED: {
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  OVERDUE: {
    color: "bg-red-100 text-red-700",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const severityColors: Record<FindingSeverity, string> = {
  OBSERVATION: "bg-slate-100 text-slate-700",
  MINOR: "bg-yellow-100 text-yellow-700",
  MAJOR: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export default function CAPAPage() {
  const [capas, setCAPAs] = useState<CAPA[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("open");

  useEffect(() => {
    async function fetchCAPAs() {
      try {
        const status = filter === "all" ? "" : filter;
        const response = await fetch(`/api/capa?status=${status}`);
        if (response.ok) {
          const data = await response.json();
          setCAPAs(data);
        }
      } catch (error) {
        console.error("Failed to fetch CAPAs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCAPAs();
  }, [filter]);

  const stats = {
    open: capas.filter(
      (c) =>
        c.status === "OPEN" ||
        c.status === "IN_PROGRESS" ||
        c.status === "PENDING_VERIFICATION"
    ).length,
    overdue: capas.filter((c) => c.status === "OVERDUE").length,
    closed: capas.filter((c) => c.status === "CLOSED").length,
    critical: capas.filter(
      (c) => c.severity === "CRITICAL" && c.status !== "CLOSED"
    ).length,
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
          <h1 className="text-2xl font-bold text-slate-900">
            Corrective Actions (CAPA)
          </h1>
          <p className="text-slate-500">
            Track and resolve corrective and preventive actions
          </p>
        </div>
        <Link href="/capa/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New CAPA
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Open CAPAs</p>
                <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.overdue}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Critical</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.critical}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Closed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.closed}
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
          variant={filter === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("open")}
        >
          Open
        </Button>
        <Button
          variant={filter === "closed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("closed")}
        >
          Closed
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
      </div>

      {/* CAPA List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === "open"
              ? "Open CAPAs"
              : filter === "closed"
                ? "Closed CAPAs"
                : "All CAPAs"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {capas.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
              <p className="text-slate-500">No CAPAs found</p>
              <p className="text-sm text-slate-400 mt-1">
                {filter === "open"
                  ? "Great! No open corrective actions"
                  : "No CAPAs match this filter"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {capas.map((capa) => {
                const statusCfg = statusConfig[capa.status];
                const isOverdue =
                  new Date(capa.dueDate) < new Date() &&
                  capa.status !== "CLOSED";
                return (
                  <Link key={capa.id} href={`/capa/${capa.id}`}>
                    <div
                      className={`p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer ${
                        isOverdue ? "border-red-200 bg-red-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              capa.severity === "CRITICAL"
                                ? "bg-red-100"
                                : capa.severity === "MAJOR"
                                  ? "bg-orange-100"
                                  : "bg-slate-100"
                            }`}
                          >
                            <AlertTriangle
                              className={`h-5 w-5 ${
                                capa.severity === "CRITICAL"
                                  ? "text-red-600"
                                  : capa.severity === "MAJOR"
                                    ? "text-orange-600"
                                    : "text-slate-600"
                              }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {capa.capaNumber}
                              </span>
                              <Badge className={statusCfg.color}>
                                {statusCfg.icon}
                                <span className="ml-1">
                                  {CAPA_STATUS_LABELS[capa.status]}
                                </span>
                              </Badge>
                              <Badge className={severityColors[capa.severity]}>
                                {FINDING_SEVERITY_LABELS[capa.severity]}
                              </Badge>
                            </div>
                            <p className="font-medium text-slate-900 mt-1">
                              {capa.title}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              {capa.isoElement &&
                                `${ISO_ELEMENT_LABELS[capa.isoElement]} • `}
                              {capa.audit && `From ${capa.audit.auditNumber} • `}
                              {capa.assignedToName &&
                                `Assigned to ${capa.assignedToName}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p
                            className={
                              isOverdue ? "text-red-600 font-medium" : "text-slate-500"
                            }
                          >
                            {isOverdue ? "Overdue" : "Due"}{" "}
                            {formatDistanceToNow(new Date(capa.dueDate), {
                              addSuffix: true,
                            })}
                          </p>
                          <p className="text-slate-400">
                            {format(new Date(capa.dueDate), "MMM d, yyyy")}
                          </p>
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
