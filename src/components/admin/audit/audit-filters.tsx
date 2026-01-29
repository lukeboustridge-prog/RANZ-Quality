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
import { Search, X, Calendar } from "lucide-react";
import { AUTH_ACTIONS } from "@/lib/auth/audit";

/**
 * Filter state for the audit log table.
 */
export interface AuditFilters {
  actorEmail: string;
  action: string;
  resourceType: string;
  dateFrom: string;
  dateTo: string;
}

interface AuditFiltersProps {
  filters: AuditFilters;
  onChange: (filters: AuditFilters) => void;
}

/**
 * Action options for the filter dropdown.
 * Derived from AUTH_ACTIONS constants.
 */
const actionOptions: { value: string; label: string }[] = [
  { value: "", label: "All Actions" },
  // Login actions
  { value: AUTH_ACTIONS.LOGIN_SUCCESS, label: "Login Success" },
  { value: AUTH_ACTIONS.LOGIN_FAILED, label: "Login Failed" },
  { value: AUTH_ACTIONS.LOGIN_RATE_LIMITED, label: "Login Rate Limited" },
  { value: AUTH_ACTIONS.LOGIN_ERROR, label: "Login Error" },
  // Logout actions
  { value: AUTH_ACTIONS.LOGOUT, label: "Logout" },
  { value: AUTH_ACTIONS.LOGOUT_ALL_SESSIONS, label: "Logout All Sessions" },
  { value: AUTH_ACTIONS.SESSION_EXPIRED, label: "Session Expired" },
  { value: AUTH_ACTIONS.SESSION_REVOKED, label: "Session Revoked" },
  // Password actions
  { value: AUTH_ACTIONS.PASSWORD_RESET_REQUESTED, label: "Password Reset Requested" },
  { value: AUTH_ACTIONS.PASSWORD_RESET_COMPLETED, label: "Password Reset Completed" },
  { value: AUTH_ACTIONS.PASSWORD_RESET_FAILED, label: "Password Reset Failed" },
  { value: AUTH_ACTIONS.PASSWORD_CHANGED, label: "Password Changed" },
  { value: AUTH_ACTIONS.FIRST_LOGIN_PASSWORD_CHANGE, label: "First Login Password Change" },
  // Account actions
  { value: AUTH_ACTIONS.ACCOUNT_LOCKED, label: "Account Locked" },
  { value: AUTH_ACTIONS.ACCOUNT_UNLOCKED, label: "Account Unlocked" },
  { value: AUTH_ACTIONS.WELCOME_EMAIL_SENT, label: "Welcome Email Sent" },
  { value: AUTH_ACTIONS.WELCOME_EMAIL_RESENT, label: "Welcome Email Resent" },
  { value: AUTH_ACTIONS.ACCOUNT_ACTIVATED, label: "Account Activated" },
  { value: AUTH_ACTIONS.ACCOUNT_ACTIVATION_EXPIRED, label: "Account Activation Expired" },
  // User management actions
  { value: AUTH_ACTIONS.USER_CREATED, label: "User Created" },
  { value: AUTH_ACTIONS.USER_UPDATED, label: "User Updated" },
  { value: AUTH_ACTIONS.USER_DEACTIVATED, label: "User Deactivated" },
  { value: AUTH_ACTIONS.USER_REACTIVATED, label: "User Reactivated" },
  { value: AUTH_ACTIONS.USER_SUSPENDED, label: "User Suspended" },
  { value: AUTH_ACTIONS.USER_ROLE_CHANGED, label: "User Role Changed" },
  { value: AUTH_ACTIONS.USER_COMPANY_CHANGED, label: "User Company Changed" },
  { value: AUTH_ACTIONS.USER_BATCH_UPDATED, label: "User Batch Updated" },
  { value: AUTH_ACTIONS.PASSWORD_ADMIN_RESET, label: "Admin Password Reset" },
];

/**
 * Resource type options for the filter dropdown.
 */
const resourceTypeOptions: { value: string; label: string }[] = [
  { value: "", label: "All Resources" },
  { value: "AuthUser", label: "AuthUser" },
  { value: "AuthSession", label: "AuthSession" },
  { value: "AuthPasswordReset", label: "AuthPasswordReset" },
  { value: "AuthCompany", label: "AuthCompany" },
];

/**
 * AuditFiltersComponent provides search and filter controls
 * for the audit log table.
 */
export function AuditFiltersComponent({
  filters,
  onChange,
}: AuditFiltersProps) {
  const hasActiveFilters =
    filters.actorEmail ||
    filters.action ||
    filters.resourceType ||
    filters.dateFrom ||
    filters.dateTo;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, actorEmail: e.target.value });
  };

  const handleActionChange = (value: string) => {
    onChange({ ...filters, action: value === "all" ? "" : value });
  };

  const handleResourceTypeChange = (value: string) => {
    onChange({ ...filters, resourceType: value === "all" ? "" : value });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, dateFrom: e.target.value });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, dateTo: e.target.value });
  };

  const handleClearFilters = () => {
    onChange({
      actorEmail: "",
      action: "",
      resourceType: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg border border-slate-200">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Actor email search */}
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="actor-search"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Actor Email
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="actor-search"
              type="text"
              placeholder="Search by email..."
              value={filters.actorEmail}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </div>

        {/* Action filter */}
        <div className="w-[200px]">
          <label
            htmlFor="action-filter"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Action
          </label>
          <Select value={filters.action || "all"} onValueChange={handleActionChange}>
            <SelectTrigger id="action-filter">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {actionOptions.map((option) => (
                <SelectItem key={option.value || "all"} value={option.value || "all"}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resource type filter */}
        <div className="w-[160px]">
          <label
            htmlFor="resource-filter"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Resource Type
          </label>
          <Select
            value={filters.resourceType || "all"}
            onValueChange={handleResourceTypeChange}
          >
            <SelectTrigger id="resource-filter">
              <SelectValue placeholder="All Resources" />
            </SelectTrigger>
            <SelectContent>
              {resourceTypeOptions.map((option) => (
                <SelectItem key={option.value || "all"} value={option.value || "all"}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date from */}
        <div className="w-[160px]">
          <label
            htmlFor="date-from"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            From Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={handleDateFromChange}
              className="pl-10"
            />
          </div>
        </div>

        {/* Date to */}
        <div className="w-[160px]">
          <label
            htmlFor="date-to"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            To Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={handleDateToChange}
              className="pl-10"
            />
          </div>
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
