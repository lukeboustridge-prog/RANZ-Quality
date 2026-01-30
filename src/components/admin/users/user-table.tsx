"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UserStatusBadge } from "./user-status-badge";
import { UserTypeBadge } from "./user-type-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import type { AuthUserStatus, AuthUserType } from "@prisma/client";

/**
 * User row interface for the admin user table.
 * Maps to the AuthUser model with joined company data.
 */
export interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: AuthUserType;
  status: AuthUserStatus;
  company: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * Selection column for batch operations.
 * Call getSelectColumn() to get a column with checkbox selection.
 */
export const selectColumn: ColumnDef<UserRow> = {
  id: "select",
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected()}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
      onClick={(e) => e.stopPropagation()}
    />
  ),
  enableSorting: false,
  enableHiding: false,
};

/**
 * Column definitions for the user management table.
 * Displays email, name, type, status, company, and last login.
 */
export const userColumns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="font-medium">{String(row.getValue("email") ?? '')}</div>
    ),
  },
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        {String(row.original.firstName ?? '')} {String(row.original.lastName ?? '')}
      </div>
    ),
  },
  {
    accessorKey: "userType",
    header: "Type",
    cell: ({ row }) => <UserTypeBadge userType={row.getValue("userType")} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <UserStatusBadge status={row.getValue("status")} />,
  },
  {
    id: "company",
    header: "Company",
    accessorFn: (row) => row.company?.name ?? null,
    cell: ({ row }) => (
      <span className="text-slate-600">
        {row.original.company?.name || "\u2014"}
      </span>
    ),
  },
  {
    accessorKey: "lastLoginAt",
    header: "Last Login",
    cell: ({ row }) => {
      const date = row.getValue("lastLoginAt");
      if (!date) {
        return <span className="text-slate-400">Never</span>;
      }
      try {
        return (
          <span className="text-slate-600">
            {format(new Date(date as string), "MMM d, yyyy HH:mm")}
          </span>
        );
      } catch {
        return <span className="text-slate-400">Invalid date</span>;
      }
    },
  },
];

/**
 * UserTable is a re-export of columns for use with DataTable.
 * The actual table rendering is done by the generic DataTable component.
 */
export { userColumns as UserTable };
