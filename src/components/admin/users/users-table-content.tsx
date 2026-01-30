"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/shared/data-table";
import { userColumns, selectColumn, type UserRow } from "@/components/admin/users/user-table";
import {
  UserFiltersComponent,
  type UserFilters,
  type CompanyOption,
} from "@/components/admin/users/user-filters";
import { BatchActions } from "@/components/admin/users/batch-actions";

// UserRow type is imported from user-table.tsx

/**
 * Default filter state.
 */
const defaultFilters: UserFilters = {
  search: "",
  status: "",
  userType: "",
  companyId: "",
};

/**
 * UsersTableContent - Incrementally restoring features to isolate error #185.
 * Step 1: Add filters back.
 */
export default function UsersTableContent() {
  const router = useRouter();
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [companies, setCompanies] = React.useState<CompanyOption[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<UserFilters>(defaultFilters);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = React.useState(filters.search);
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.search]);

  // Fetch companies for filter dropdown
  React.useEffect(() => {
    async function fetchCompanies() {
      try {
        const response = await fetch("/api/admin/companies");
        if (response.ok) {
          const data = await response.json();
          setCompanies(data.companies || []);
        }
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      } finally {
        setIsLoadingCompanies(false);
      }
    }
    fetchCompanies();
  }, []);

  // Fetch users when filters change
  React.useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "20");

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (filters.status && filters.status !== "all") {
        params.set("status", filters.status);
      }
      if (filters.userType && filters.userType !== "all") {
        params.set("userType", filters.userType);
      }
      if (filters.companyId && filters.companyId !== "all") {
        params.set("companyId", filters.companyId);
      }

      try {
        const response = await fetch(`/api/admin/users?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [debouncedSearch, filters.status, filters.userType, filters.companyId]);

  // Memoized to prevent unnecessary child re-renders
  const handleFiltersChange = React.useCallback((newFilters: UserFilters) => {
    setFilters(newFilters);
  }, []);

  // Handle row click - navigate to user detail - memoized
  const handleRowClick = React.useCallback((row: { original: UserRow }) => {
    router.push(`/admin/users/${row.original.id}`);
  }, [router]);

  // Build columns with selection
  const columnsWithSelect = React.useMemo(
    () => [selectColumn, ...userColumns],
    []
  );

  // Handle row selection changes - memoized to prevent unnecessary re-renders
  const handleSelectionChange = React.useCallback((selectedRows: UserRow[]) => {
    setSelectedIds(selectedRows.map((row) => row.id));
  }, []);

  // Handle batch action result - memoized
  const handleBatchAction = React.useCallback((result: {
    success: boolean;
    action: string;
    updated: number;
    failed: number;
    error?: string;
  }) => {
    if (result.success) {
      setSelectedIds([]);
      // Trigger refresh
      setFilters((f) => ({ ...f }));
    }
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "20");
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.userType && filters.userType !== "all") params.set("userType", filters.userType);
    if (filters.companyId && filters.companyId !== "all") params.set("companyId", filters.companyId);

    fetch(`/api/admin/users?${params}`)
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {String(error)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <UserFiltersComponent
        filters={filters}
        onChange={handleFiltersChange}
        companies={companies}
        isLoadingCompanies={isLoadingCompanies}
      />

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <span className="text-sm text-slate-500">
          {users.length} users loaded
        </span>
      </div>

      {/* Batch actions toolbar */}
      <BatchActions
        selectedIds={selectedIds}
        onAction={handleBatchAction}
        onClear={() => setSelectedIds([])}
      />

      {/* DataTable with TanStack Table */}
      <DataTable
        columns={columnsWithSelect}
        data={users}
        isLoading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
        pageSize={20}
      />
    </div>
  );
}
