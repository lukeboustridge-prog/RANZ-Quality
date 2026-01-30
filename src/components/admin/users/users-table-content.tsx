"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/shared/data-table";
import { userColumns, selectColumn, type UserRow } from "@/components/admin/users/user-table";
import {
  UserFiltersComponent,
  type UserFilters,
  type CompanyOption,
} from "@/components/admin/users/user-filters";
import { ExportButton } from "@/components/admin/users/export-button";
import { BatchActions } from "@/components/admin/users/batch-actions";

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
 * Default filter state.
 */
const defaultFilters: UserFilters = {
  search: "",
  status: "",
  userType: "",
  companyId: "",
};

/**
 * UsersTableContent contains all the data fetching and table rendering logic.
 * This component is loaded client-side only via dynamic import to prevent
 * hydration mismatches with the complex DataTable component.
 */
export default function UsersTableContent() {
  const router = useRouter();
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [companies, setCompanies] = React.useState<CompanyOption[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<UserFilters>(defaultFilters);
  const [pagination, setPagination] = React.useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [batchMessage, setBatchMessage] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Debounce search to avoid too many API calls
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

  // Fetch users when filters or pagination change
  React.useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());

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
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch users");
        }

        const data = await response.json();
        setUsers(data.users || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 0,
        }));
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [
    pagination.page,
    pagination.limit,
    debouncedSearch,
    filters.status,
    filters.userType,
    filters.companyId,
  ]);

  // Handle row click - navigate to user detail
  const handleRowClick = (row: { original: UserRow }) => {
    router.push(`/admin/users/${row.original.id}`);
  };

  // Handle filter changes - reset to page 1
  const handleFiltersChange = (newFilters: UserFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
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
    setSelectedIds([]); // Clear selection on refresh
    setPagination((prev) => ({ ...prev })); // Trigger refetch
  };

  // Handle row selection changes
  const handleSelectionChange = (selectedRows: UserRow[]) => {
    setSelectedIds(selectedRows.map((row) => row.id));
  };

  // Handle batch action result
  const handleBatchAction = (result: {
    success: boolean;
    action: string;
    updated: number;
    failed: number;
    error?: string;
  }) => {
    if (result.success) {
      setBatchMessage({
        type: "success",
        message: `${result.action}: ${result.updated} user(s) updated${
          result.failed > 0 ? `, ${result.failed} failed` : ""
        }`,
      });
      setSelectedIds([]); // Clear selection after batch action
      handleRefresh(); // Refresh user list
    } else {
      setBatchMessage({
        type: "error",
        message: result.error || "Batch operation failed",
      });
    }

    // Clear message after 5 seconds
    setTimeout(() => setBatchMessage(null), 5000);
  };

  // Build columns with selection
  const columnsWithSelect = React.useMemo(
    () => [selectColumn, ...userColumns],
    []
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <ExportButton filters={filters} />
      </div>

      {/* Filters */}
      <UserFiltersComponent
        filters={filters}
        onChange={handleFiltersChange}
        companies={companies}
        isLoadingCompanies={isLoadingCompanies}
      />

      {/* Batch actions toolbar */}
      <BatchActions
        selectedIds={selectedIds}
        onAction={handleBatchAction}
        onClear={() => setSelectedIds([])}
      />

      {/* Batch action message */}
      {batchMessage && (
        <div
          className={`p-4 rounded-lg ${
            batchMessage.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {batchMessage.message}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Total count */}
      <div className="text-sm text-slate-500">
        {pagination.total} user{pagination.total !== 1 ? "s" : ""} total
      </div>

      {/* User table */}
      <DataTable
        columns={columnsWithSelect}
        data={users}
        isLoading={loading}
        onRowClick={handleRowClick}
        onSelectionChange={handleSelectionChange}
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
              {[10, 20, 50, 100].map((size) => (
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
    </div>
  );
}
