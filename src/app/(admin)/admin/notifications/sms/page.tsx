"use client";

import { useEffect, useState, useCallback } from "react";
import { SMSLogsTable } from "@/components/admin/sms-logs-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";

interface SMSLog {
  id: string;
  createdAt: string;
  recipient: string | null;
  message: string;
  status: "PENDING" | "QUEUED" | "SENT" | "FAILED" | "DELIVERED";
  sentAt: string | null;
  externalId: string | null;
  failureReason: string | null;
  retryCount: number;
  lastRetryAt: string | null;
  nextRetryAt: string | null;
  type: string;
  priority: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function SMSLogsPage() {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
      });

      if (status && status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/admin/notifications/sms?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch SMS logs");
      }

      const data = await response.json();
      setLogs(data.notifications);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [status, search, startDate, endDate]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage);
  };

  const handleRefresh = () => {
    fetchLogs(pagination.page);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            SMS Delivery Logs
          </h1>
          <p className="text-muted-foreground">
            Monitor SMS notification delivery and troubleshoot failures
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter SMS logs by status, date, or recipient</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="QUEUED">Queued</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Recipient Phone</Label>
              <Input
                id="search"
                type="text"
                placeholder="+6421..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">From Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">To Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="pt-6">
          {error ? (
            <div className="text-center text-destructive py-8">
              <p>Error: {error}</p>
              <Button variant="outline" onClick={handleRefresh} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SMSLogsTable
              logs={logs}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
