"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UserStatusBadge } from "./user-status-badge";
import { UserTypeBadge } from "./user-type-badge";
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
 * Column definitions for the user management table.
 * Displays email, name, type, status, company, and last login.
 */
export const userColumns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("email")}</div>
    ),
  },
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        {row.original.firstName} {row.original.lastName}
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
    accessorKey: "company",
    header: "Company",
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
      return (
        <span className="text-slate-600">
          {format(new Date(date as string), "MMM d, yyyy HH:mm")}
        </span>
      );
    },
  },
];

/**
 * UserTable is a re-export of columns for use with DataTable.
 * The actual table rendering is done by the generic DataTable component.
 */
export { userColumns as UserTable };
