"use client";

import { AuditAction } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

interface AuditLogEntry {
  id: bigint;
  eventId: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  previousState: unknown;
  newState: unknown;
  metadata: unknown;
  timestamp: Date;
}

interface AuditTrailTableProps {
  logs: AuditLogEntry[];
}

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  APPROVE: "bg-emerald-100 text-emerald-800",
  REJECT: "bg-orange-100 text-orange-800",
  VERIFY: "bg-purple-100 text-purple-800",
  LBP_VERIFY: "bg-purple-100 text-purple-800",
  READ: "bg-gray-100 text-gray-800",
  LOGIN: "bg-blue-100 text-blue-800",
  LOGOUT: "bg-gray-100 text-gray-800",
  EXPORT: "bg-yellow-100 text-yellow-800",
  AUDIT_START: "bg-indigo-100 text-indigo-800",
  AUDIT_COMPLETE: "bg-emerald-100 text-emerald-800",
};

export function AuditTrailTable({ logs }: AuditTrailTableProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No audit logs found for this organization.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Actor</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Resource</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id.toString()} className="border-b">
              <td className="px-4 py-3 text-sm">
                <div className="font-medium">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="font-medium">{log.actorEmail}</div>
                <div className="text-xs text-muted-foreground">{log.actorRole}</div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    actionColors[log.action] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {log.action}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="font-medium">{log.resourceType}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {log.resourceId.substring(0, 12)}...
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                <StateChangeSummary
                  action={log.action}
                  previousState={log.previousState as Record<string, unknown> | null}
                  newState={log.newState as Record<string, unknown> | null}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StateChangeSummary({
  action,
  previousState,
  newState,
}: {
  action: AuditAction;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
}) {
  if (action === "CREATE" && newState) {
    const keys = Object.keys(newState).slice(0, 3);
    return (
      <span className="text-muted-foreground">
        Created with {keys.join(", ")}
        {Object.keys(newState).length > 3 && "..."}
      </span>
    );
  }

  if (action === "DELETE" && previousState) {
    return <span className="text-muted-foreground">Record deleted</span>;
  }

  if (action === "UPDATE" && previousState && newState) {
    const changedKeys = Object.keys(newState).filter(
      (key) => JSON.stringify(previousState[key]) !== JSON.stringify(newState[key])
    );
    return (
      <span className="text-muted-foreground">
        Changed: {changedKeys.join(", ") || "No visible changes"}
      </span>
    );
  }

  if (action === "APPROVE") {
    return <span className="text-emerald-600">Document approved</span>;
  }

  if (action === "REJECT") {
    return <span className="text-orange-600">Document rejected</span>;
  }

  if (action === "VERIFY" || action === "LBP_VERIFY") {
    return <span className="text-purple-600">LBP verification performed</span>;
  }

  if (action === "LOGIN") {
    return <span className="text-muted-foreground">User logged in</span>;
  }

  if (action === "LOGOUT") {
    return <span className="text-muted-foreground">User logged out</span>;
  }

  if (action === "EXPORT") {
    return <span className="text-muted-foreground">Data exported</span>;
  }

  if (action === "AUDIT_START") {
    return <span className="text-indigo-600">Audit initiated</span>;
  }

  if (action === "AUDIT_COMPLETE") {
    return <span className="text-emerald-600">Audit completed</span>;
  }

  return <span className="text-muted-foreground">-</span>;
}
