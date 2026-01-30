"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Plus, RefreshCw, Users, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Dynamic imports with ssr: false to prevent hydration mismatches
const UsersTableContent = dynamic(
  () => import("@/components/admin/users/users-table-content"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading users...</span>
      </div>
    ),
  }
);

/**
 * AdminUsersPage provides the user management interface for RANZ staff.
 * Uses dynamic imports to prevent hydration mismatches with complex table components.
 */
export default function AdminUsersPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h1>
          <p className="text-slate-500 mt-1">
            Manage authentication users across RANZ applications
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users/import">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </Link>
          <Link href="/admin/users/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </Link>
        </div>
      </div>

      {/* User table content - loaded client-side only to prevent hydration issues */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-medium">Users</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <UsersTableContent />
        </CardContent>
      </Card>
    </div>
  );
}
