"use client";

import * as React from "react";
import { FileText, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/admin/shared/data-table";
import {
  auditLogColumns,
  type AuditLogRow,
} from "@/components/admin/audit/audit-log-table";
import {
  AuditFiltersComponent,
  type AuditFilters,
} from "@/components/admin/audit/audit-filters";
import { format } from "date-fns";

/**
 * Pagination state interface.
 */
interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Default filter state - last 7 days.
 */
const getDefaultFilters = (): AuditFilters => {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  return {
    actorEmail: "",
    action: "",
    resourceType: "",
    dateFrom: weekAgo.toISOString().split("T")[0],
    dateTo: today.toISOString().split("T")[0],
  };
};

/**
 * AdminAuditLogsPage provides the audit log viewer for security monitoring.
 * Displays a filterable, paginated list of authentication events.
 */
export default function AdminAuditLogsPage() {
  const [logs, setLogs] = React.useState<AuditLogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<AuditFilters>(getDefaultFilters);
  const [pagination, setPagination] = React.useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [selectedLog, setSelectedLog] = React.useState<AuditLogRow | null>(null);

  // Debounce search to avoid too many API calls
  const [debouncedEmail, setDebouncedEmail] = React.useState(filters.actorEmail);
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedEmail(filters.actorEmail);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.actorEmail]);

  // Fetch logs when filters or pagination change
  React.useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());

      if (debouncedEmail) {
        params.set("actorEmail", debouncedEmail);
      }
      if (filters.action) {
        params.set("action", filters.action);
      }
      if (filters.resourceType) {
        params.set("resourceType", filters.resourceType);
      }
      if (filters.dateFrom) {
        params.set("dateFrom", new Date(filters.dateFrom).toISOString());
      }
      if (filters.dateTo) {
        // Include the full day by setting time to end of day
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        params.set("dateTo", endDate.toISOString());
      }

      try {
        const response = await fetch(`/api/admin/audit-logs?${params}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch audit logs");
        }

        const data = await response.json();
        setLogs(data.logs || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 0,
        }));
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch audit logs");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [
    pagination.page,
    pagination.limit,
    debouncedEmail,
    filters.action,
    filters.resourceType,
    filters.dateFrom,
    filters.dateTo,
  ]);

  // Handle filter changes - reset to page 1
  const handleFiltersChange = (newFilters: AuditFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle row click - show details modal
  const handleRowClick = (row: { original: AuditLogRow }) => {
    setSelectedLog(row.original);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // Handle page size change
  const handleLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  // Refresh data
  const handleRefresh = () => {
    setPagination((prev) => ({ ...prev })); // Trigger refetch
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Audit Logs
          </h1>
          <p className="text-slate-500 mt-1">
            View authentication and security events across RANZ applications
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <AuditFiltersComponent filters={filters} onChange={handleFiltersChange} />

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Audit log table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-medium">
            Events{" "}
            <span className="text-slate-500 font-normal">
              ({pagination.total} total)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <DataTable
            columns={auditLogColumns}
            data={logs}
            isLoading={loading}
            onRowClick={handleRowClick}
            pageSize={pagination.limit}
          />

          {/* Pagination controls */}
          {!loading && pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Rows per page:</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="h-8 w-[70px] rounded-md border border-slate-300 bg-white px-2 text-sm"
                >
                  {[25, 50, 100, 200].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.pages)}
                    disabled={pagination.page >= pagination.pages}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">
                    Event ID
                  </label>
                  <p className="font-mono text-sm">{selectedLog.eventId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">
                    Timestamp
                  </label>
                  <p className="text-sm">
                    {format(new Date(selectedLog.timestamp), "PPpp")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">
                    Action
                  </label>
                  <p className="text-sm font-medium">
                    {selectedLog.action.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">
                    Actor
                  </label>
                  <p className="text-sm">{selectedLog.actorEmail || "System"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">
                    Actor Role
                  </label>
                  <p className="text-sm">
                    {selectedLog.actorRole?.replace(/_/g, " ") || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">
                    IP Address
                  </label>
                  <p className="font-mono text-sm">
                    {selectedLog.ipAddress || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">
                    Resource Type
                  </label>
                  <p className="text-sm">{selectedLog.resourceType || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">
                    Resource ID
                  </label>
                  <p className="font-mono text-sm">
                    {selectedLog.resourceId || "-"}
                  </p>
                </div>
              </div>

              {selectedLog.metadata && (
                <div>
                  <label className="text-sm font-medium text-slate-500">
                    Metadata
                  </label>
                  <pre className="mt-1 p-3 bg-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
