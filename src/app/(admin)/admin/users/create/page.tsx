"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UserForm,
  type UserFormData,
  type CompanyOption,
} from "@/components/admin/users/user-form";

/**
 * CreateUserPage allows RANZ staff to create new user accounts.
 * On success, sends a welcome email with activation link.
 */
export default function CreateUserPage() {
  const router = useRouter();
  const [companies, setCompanies] = React.useState<CompanyOption[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch companies for dropdown
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

  /**
   * Handle form submission.
   */
  const handleSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || undefined,
          userType: data.userType,
          companyId: data.companyId || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("A user with this email already exists.");
        }
        throw new Error(result.error || "Failed to create user");
      }

      // Success - navigate to user detail page with success message
      router.push(`/admin/users/${result.user.id}?created=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel - go back to user list.
   */
  const handleCancel = () => {
    router.push("/admin/users");
  };

  return (
    <div className="p-6 max-w-2xl">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
      </div>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="h-6 w-6" />
          Create New User
        </h1>
        <p className="text-slate-500 mt-1">
          Create a new user account. A welcome email with activation instructions
          will be sent automatically.
        </p>
      </div>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Enter the user information. They will receive an email to set their
            password and activate their account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <UserForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            companies={companies}
            isLoadingCompanies={isLoadingCompanies}
          />
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-medium text-blue-900 mb-2">
            What happens next?
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. The user will receive a welcome email at the address provided.</li>
            <li>2. They will click the activation link (valid for 7 days).</li>
            <li>3. They will set their password and complete account setup.</li>
            <li>4. They can then log in and access the portal.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
