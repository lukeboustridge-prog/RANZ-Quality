"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  UserFiltersComponent,
  type UserFilters,
  type CompanyOption,
} from "@/components/admin/users/user-filters";

/**
 * User data structure from API.
 */
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  status: string;
  company: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
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
 * UsersTableContent - Incrementally restoring features to isolate error #185.
 * Step 1: Add filters back.
 */
export default function UsersTableContent() {
  const router = useRouter();
  const [users, setUsers] = React.useState<User[]>([]);
  const [companies, setCompanies] = React.useState<CompanyOption[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<UserFilters>(defaultFilters);

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

  const handleFiltersChange = (newFilters: UserFilters) => {
    setFilters(newFilters);
  };

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

      {/* Simple table - keeping HTML table for now */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Company</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={String(user.id)}
                  className="border-b hover:bg-slate-50 cursor-pointer"
                  onClick={() => router.push(`/admin/users/${String(user.id)}`)}
                >
                  <td className="px-4 py-3 font-medium">
                    {String(user.email ?? "")}
                  </td>
                  <td className="px-4 py-3">
                    {String(user.firstName ?? "")} {String(user.lastName ?? "")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                      {String(user.userType ?? "Unknown")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {String(user.status ?? "Unknown")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.company ? String(user.company.name ?? "Unknown") : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
