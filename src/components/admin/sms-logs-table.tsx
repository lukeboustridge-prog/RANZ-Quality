"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

interface SMSLogsTableProps {
  logs: SMSLog[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  QUEUED: "secondary",
  SENT: "default",
  DELIVERED: "default",
  FAILED: "destructive",
};

export function SMSLogsTable({ logs, pagination, onPageChange }: SMSLogsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Twilio SID</TableHead>
            <TableHead>Retries</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No SMS logs found
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <>
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                >
                  <TableCell className="font-mono text-sm">
                    {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell className="font-mono">{log.recipient || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.type.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[log.status] || "outline"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.externalId ? log.externalId.slice(0, 20) + "..." : "-"}
                  </TableCell>
                  <TableCell>{log.retryCount}</TableCell>
                </TableRow>
                {expandedRow === log.id && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/30 p-4">
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold">Message:</span>
                          <p className="mt-1 text-muted-foreground">{log.message}</p>
                        </div>
                        {log.sentAt && (
                          <div>
                            <span className="font-semibold">Sent At:</span>{" "}
                            {format(new Date(log.sentAt), "yyyy-MM-dd HH:mm:ss")}
                          </div>
                        )}
                        {log.failureReason && (
                          <div>
                            <span className="font-semibold text-destructive">Failure Reason:</span>{" "}
                            <span className="text-destructive">{log.failureReason}</span>
                          </div>
                        )}
                        {log.nextRetryAt && (
                          <div>
                            <span className="font-semibold">Next Retry:</span>{" "}
                            {format(new Date(log.nextRetryAt), "yyyy-MM-dd HH:mm:ss")}
                          </div>
                        )}
                        {log.externalId && (
                          <div>
                            <span className="font-semibold">Full Twilio SID:</span>{" "}
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{log.externalId}</code>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {logs.length} of {pagination.totalCount} SMS notifications
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
