"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AUTH_ACTIONS } from "@/lib/auth/audit";

/**
 * Audit log row interface matching API response.
 */
export interface AuditLogRow {
  id: string;
  eventId: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  ipAddress: string | null;
  resourceType: string | null;
  resourceId: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

/**
 * ActionBadge displays the action type with color coding.
 */
function ActionBadge({ action }: { action: string }) {
  // Determine color based on action type
  const getActionStyle = (action: string): string => {
    // Success actions - green
    if (
      action === AUTH_ACTIONS.LOGIN_SUCCESS ||
      action === AUTH_ACTIONS.ACCOUNT_ACTIVATED ||
      action === AUTH_ACTIONS.ACCOUNT_UNLOCKED ||
      action === AUTH_ACTIONS.USER_REACTIVATED
    ) {
      return "bg-green-100 text-green-800 border-green-200";
    }

    // Failure/error actions - red
    if (
      action === AUTH_ACTIONS.LOGIN_FAILED ||
      action === AUTH_ACTIONS.LOGIN_ERROR ||
      action === AUTH_ACTIONS.LOGIN_RATE_LIMITED ||
      action === AUTH_ACTIONS.PASSWORD_RESET_FAILED ||
      action === AUTH_ACTIONS.ACCOUNT_LOCKED ||
      action === AUTH_ACTIONS.ACCOUNT_ACTIVATION_EXPIRED ||
      action === AUTH_ACTIONS.USER_SUSPENDED ||
      action === AUTH_ACTIONS.USER_DEACTIVATED
    ) {
      return "bg-red-100 text-red-800 border-red-200";
    }

    // Password/security actions - yellow
    if (
      action === AUTH_ACTIONS.PASSWORD_RESET_REQUESTED ||
      action === AUTH_ACTIONS.PASSWORD_RESET_COMPLETED ||
      action === AUTH_ACTIONS.PASSWORD_CHANGED ||
      action === AUTH_ACTIONS.FIRST_LOGIN_PASSWORD_CHANGE ||
      action === AUTH_ACTIONS.PASSWORD_ADMIN_RESET
    ) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }

    // User management actions - blue
    if (
      action === AUTH_ACTIONS.USER_CREATED ||
      action === AUTH_ACTIONS.USER_UPDATED ||
      action === AUTH_ACTIONS.USER_ROLE_CHANGED ||
      action === AUTH_ACTIONS.USER_COMPANY_CHANGED ||
      action === AUTH_ACTIONS.USER_BATCH_UPDATED
    ) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }

    // Neutral/logout actions - slate
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  // Format action name for display
  const formatAction = (action: string): string => {
    return action.replace(/_/g, " ");
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        getActionStyle(action)
      )}
    >
      {formatAction(action)}
    </span>
  );
}

/**
 * Column definitions for the audit log table.
 */
export const auditLogColumns: ColumnDef<AuditLogRow>[] = [
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ row }) => {
      const timestamp = row.getValue("timestamp") as string;
      return (
        <span className="text-sm text-slate-600 whitespace-nowrap">
          {format(new Date(timestamp), "MMM d, HH:mm:ss")}
        </span>
      );
    },
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => <ActionBadge action={row.getValue("action")} />,
  },
  {
    accessorKey: "actorEmail",
    header: "Actor",
    cell: ({ row }) => {
      const email = row.getValue("actorEmail") as string | null;
      const role = row.original.actorRole;
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-900">
            {email || "System"}
          </span>
          {role && (
            <span className="text-xs text-slate-500">{role.replace(/_/g, " ")}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "resourceType",
    header: "Resource",
    cell: ({ row }) => {
      const resourceType = row.original.resourceType;
      const resourceId = row.original.resourceId;
      return (
        <div className="text-sm">
          <span className="text-slate-700">{resourceType || "-"}</span>
          {resourceId && (
            <span className="text-slate-400 ml-1 font-mono text-xs">
              #{resourceId.slice(0, 8)}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "ipAddress",
    header: "IP Address",
    cell: ({ row }) => {
      const ip = row.getValue("ipAddress") as string | null;
      return (
        <span className="text-sm text-slate-600 font-mono">{ip || "-"}</span>
      );
    },
  },
];
