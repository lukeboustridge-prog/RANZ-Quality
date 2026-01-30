"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { AuthUserStatus, AuthUserType } from "@prisma/client";

/**
 * Filter state for the user management table.
 */
export interface UserFilters {
  search: string;
  status: string;
  userType: string;
  companyId: string;
}

/**
 * Company option for the company filter dropdown.
 */
export interface CompanyOption {
  id: string;
  name: string;
}

interface UserFiltersProps {
  filters: UserFilters;
  onChange: (filters: UserFilters) => void;
  companies?: CompanyOption[];
  isLoadingCompanies?: boolean;
}

/**
 * User status options for the filter dropdown.
 * Using "all" as the value for "All Statuses" to avoid empty string issues with Radix Select.
 */
const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING_ACTIVATION", label: "Pending Activation" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

/**
 * User type options for the filter dropdown.
 * Using "all" as the value for "All Types" to avoid empty string issues with Radix Select.
 */
const userTypeOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "RANZ_ADMIN", label: "RANZ Admin" },
  { value: "RANZ_STAFF", label: "RANZ Staff" },
  { value: "RANZ_INSPECTOR", label: "RANZ Inspector" },
  { value: "EXTERNAL_INSPECTOR", label: "External Inspector" },
  { value: "MEMBER_COMPANY_ADMIN", label: "Company Admin" },
  { value: "MEMBER_COMPANY_USER", label: "Company User" },
];

/**
 * UserFiltersComponent provides search and filter controls
 * for the user management table.
 */
export function UserFiltersComponent({
  filters,
  onChange,
  companies = [],
  isLoadingCompanies = false,
}: UserFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.userType ||
    filters.companyId;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleStatusChange = (value: string) => {
    onChange({ ...filters, status: value });
  };

  const handleTypeChange = (value: string) => {
    onChange({ ...filters, userType: value });
  };

  const handleCompanyChange = (value: string) => {
    onChange({ ...filters, companyId: value });
  };

  const handleClearFilters = () => {
    onChange({
      search: "",
      status: "",
      userType: "",
      companyId: "",
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg border border-slate-200">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Search input */}
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="user-search"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="user-search"
              type="text"
              placeholder="Search by email or name..."
              value={filters.search}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="w-[180px]">
          <label
            htmlFor="status-filter"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Status
          </label>
          <Select value={filters.status || "all"} onValueChange={handleStatusChange}>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* User type filter */}
        <div className="w-[180px]">
          <label
            htmlFor="type-filter"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            User Type
          </label>
          <Select value={filters.userType || "all"} onValueChange={handleTypeChange}>
            <SelectTrigger id="type-filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {userTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Company filter */}
        <div className="w-[200px]">
          <label
            htmlFor="company-filter"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Company
          </label>
          <Select
            value={filters.companyId || "all"}
            onValueChange={handleCompanyChange}
            disabled={isLoadingCompanies}
          >
            <SelectTrigger id="company-filter">
              <SelectValue
                placeholder={isLoadingCompanies ? "Loading..." : "All Companies"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="h-10"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
