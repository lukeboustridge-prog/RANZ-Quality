"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { AuthUserType } from "@prisma/client";

/**
 * Form data interface for user create/edit.
 */
export interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: AuthUserType;
  companyId: string | null;
}

/**
 * Company option for the company dropdown.
 */
export interface CompanyOption {
  id: string;
  name: string;
}

interface UserFormProps {
  mode: "create" | "edit";
  initialData?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  companies?: CompanyOption[];
  isLoadingCompanies?: boolean;
}

/**
 * User type options with labels for display.
 */
const userTypeOptions: { value: AuthUserType; label: string }[] = [
  { value: "RANZ_ADMIN", label: "RANZ Admin" },
  { value: "RANZ_STAFF", label: "RANZ Staff" },
  { value: "RANZ_INSPECTOR", label: "RANZ Inspector" },
  { value: "EXTERNAL_INSPECTOR", label: "External Inspector" },
  { value: "MEMBER_COMPANY_ADMIN", label: "Company Admin" },
  { value: "MEMBER_COMPANY_USER", label: "Company User" },
];

/**
 * User types that require a company assignment.
 */
const companyRequiredTypes: AuthUserType[] = [
  "MEMBER_COMPANY_ADMIN",
  "MEMBER_COMPANY_USER",
];

/**
 * UserForm component for creating and editing users.
 * Handles validation and company requirement logic.
 */
export function UserForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  companies = [],
  isLoadingCompanies = false,
}: UserFormProps) {
  const [formData, setFormData] = React.useState<UserFormData>({
    email: initialData?.email || "",
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    phone: initialData?.phone || "",
    userType: initialData?.userType || "MEMBER_COMPANY_USER",
    companyId: initialData?.companyId || null,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Check if company is required based on user type
  const isCompanyRequired = companyRequiredTypes.includes(formData.userType);

  /**
   * Validate form data before submission.
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode === "create" && !formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      mode === "create" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (isCompanyRequired && !formData.companyId) {
      newErrors.companyId = "Company is required for member user types";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit(formData);
  };

  /**
   * Handle input changes.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  /**
   * Handle user type change - clear company if not required.
   */
  const handleUserTypeChange = (value: string) => {
    const newType = value as AuthUserType;
    const needsCompany = companyRequiredTypes.includes(newType);

    setFormData((prev) => ({
      ...prev,
      userType: newType,
      companyId: needsCompany ? prev.companyId : null,
    }));

    // Clear company error if no longer required
    if (!needsCompany && errors.companyId) {
      setErrors((prev) => ({ ...prev, companyId: "" }));
    }
  };

  /**
   * Handle company change.
   */
  const handleCompanyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      companyId: value === "none" ? null : value,
    }));

    // Clear error when user selects
    if (errors.companyId) {
      setErrors((prev) => ({ ...prev, companyId: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email field (disabled in edit mode) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          disabled={mode === "edit" || isSubmitting}
          placeholder="user@example.com"
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email}</p>
        )}
        {mode === "edit" && (
          <p className="text-xs text-slate-500">
            Email cannot be changed after account creation
          </p>
        )}
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleInputChange}
            disabled={isSubmitting}
            placeholder="John"
            className={errors.firstName ? "border-red-500" : ""}
          />
          {errors.firstName && (
            <p className="text-sm text-red-500">{errors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleInputChange}
            disabled={isSubmitting}
            placeholder="Doe"
            className={errors.lastName ? "border-red-500" : ""}
          />
          {errors.lastName && (
            <p className="text-sm text-red-500">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Phone field */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleInputChange}
          disabled={isSubmitting}
          placeholder="+64 21 123 4567"
        />
      </div>

      {/* User type field */}
      <div className="space-y-2">
        <Label htmlFor="userType">User Type</Label>
        <Select
          value={formData.userType}
          onValueChange={handleUserTypeChange}
          disabled={isSubmitting}
        >
          <SelectTrigger id="userType">
            <SelectValue placeholder="Select user type" />
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

      {/* Company field (shown when type requires it) */}
      {isCompanyRequired && (
        <div className="space-y-2">
          <Label htmlFor="companyId">Company</Label>
          <Select
            value={formData.companyId || "none"}
            onValueChange={handleCompanyChange}
            disabled={isSubmitting || isLoadingCompanies}
          >
            <SelectTrigger
              id="companyId"
              className={errors.companyId ? "border-red-500" : ""}
            >
              <SelectValue
                placeholder={isLoadingCompanies ? "Loading..." : "Select company"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select a company...</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.companyId && (
            <p className="text-sm text-red-500">{errors.companyId}</p>
          )}
        </div>
      )}

      {/* Form actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === "create" ? "Create User" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
