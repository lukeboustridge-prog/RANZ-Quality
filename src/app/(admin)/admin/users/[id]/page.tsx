"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserStatusBadge } from "@/components/admin/users/user-status-badge";
import { UserTypeBadge } from "@/components/admin/users/user-type-badge";
import {
  UserForm,
  type UserFormData,
  type CompanyOption,
} from "@/components/admin/users/user-form";
import type { AuthUserStatus, AuthUserType } from "@prisma/client";

/**
 * User data from API response.
 */
interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  userType: AuthUserType;
  status: AuthUserStatus;
  companyId: string | null;
  company: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  mustChangePassword: boolean;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
  deactivationReason: string | null;
  createdBy: string | null;
}

/**
 * AdminUserDetailPage displays and allows editing of a single user.
 */
export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = params.id as string;

  const [user, setUser] = React.useState<UserData | null>(null);
  const [companies, setCompanies] = React.useState<CompanyOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Status change dialog state
  const [statusDialog, setStatusDialog] = React.useState<{
    isOpen: boolean;
    targetStatus: AuthUserStatus | null;
    reason: string;
  }>({
    isOpen: false,
    targetStatus: null,
    reason: "",
  });

  // Resend welcome email state
  const [isResending, setIsResending] = React.useState(false);

  // Check for success message from create page
  React.useEffect(() => {
    if (searchParams.get("created") === "true") {
      setSuccessMessage("User created successfully. Welcome email sent.");
      // Clear the query param
      router.replace(`/admin/users/${userId}`, { scroll: false });
    }
  }, [searchParams, userId, router]);

  // Fetch user data
  React.useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/users/${userId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("User not found");
          } else {
            const data = await response.json();
            throw new Error(data.error || "Failed to fetch user");
          }
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch user");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

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
   * Handle form submission for user updates.
   */
  const handleSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          userType: data.userType,
          companyId: data.companyId,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update user");
      }

      const result = await response.json();
      setUser(result.user);
      setSuccessMessage("User updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle status change (deactivate, reactivate, suspend).
   */
  const handleStatusChange = async () => {
    if (!statusDialog.targetStatus) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusDialog.targetStatus,
          reason: statusDialog.reason || undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update status");
      }

      const result = await response.json();
      setUser(result.user);
      setSuccessMessage(`User status changed to ${statusDialog.targetStatus}.`);
      setStatusDialog({ isOpen: false, targetStatus: null, reason: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle resend welcome email.
   */
  const handleResendWelcome = async () => {
    setIsResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/auth/resend-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to resend welcome email");
      }

      setSuccessMessage("Welcome email sent successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to resend welcome email"
      );
    } finally {
      setIsResending(false);
    }
  };

  /**
   * Open status change dialog.
   */
  const openStatusDialog = (targetStatus: AuthUserStatus) => {
    setStatusDialog({
      isOpen: true,
      targetStatus,
      reason: "",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-100 rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state (user not found)
  if (error && !user) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Link
            href="/admin/users"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                {error}
              </h2>
              <p className="text-slate-500 mb-6">
                The user you are looking for could not be found.
              </p>
              <Link href="/admin/users">
                <Button>Return to User List</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/admin/users"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* User header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <User className="h-6 w-6" />
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-slate-500 mt-1">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <UserTypeBadge userType={user.userType} />
          <UserStatusBadge status={user.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Edit form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Details</CardTitle>
              <CardDescription>
                Update user profile and role information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserForm
                mode="edit"
                initialData={{
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  phone: user.phone || "",
                  userType: user.userType,
                  companyId: user.companyId,
                }}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                companies={companies}
                isLoadingCompanies={isLoadingCompanies}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Account info and actions */}
        <div className="space-y-6">
          {/* Account status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <UserStatusBadge status={user.status} />
              </div>

              {/* Status-specific actions */}
              {user.status === "ACTIVE" && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={() => openStatusDialog("SUSPENDED")}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Suspend User
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => openStatusDialog("DEACTIVATED")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Deactivate User
                  </Button>
                </div>
              )}

              {user.status === "PENDING_ACTIVATION" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleResendWelcome}
                  disabled={isResending}
                >
                  {isResending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Resend Welcome Email
                </Button>
              )}

              {(user.status === "SUSPENDED" ||
                user.status === "DEACTIVATED") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-green-600 border-green-300 hover:bg-green-50"
                  onClick={() => openStatusDialog("ACTIVE")}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Reactivate User
                </Button>
              )}

              {/* Deactivation details */}
              {user.status === "DEACTIVATED" && user.deactivatedAt && (
                <div className="pt-2 border-t border-slate-200 text-sm">
                  <p className="text-slate-500">
                    Deactivated:{" "}
                    {format(new Date(user.deactivatedAt), "MMM d, yyyy HH:mm")}
                  </p>
                  {user.deactivationReason && (
                    <p className="text-slate-500 mt-1">
                      Reason: {user.deactivationReason}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-900">
                  {format(new Date(user.createdAt), "MMM d, yyyy")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Login</span>
                <span className="text-slate-900">
                  {user.lastLoginAt
                    ? format(new Date(user.lastLoginAt), "MMM d, yyyy HH:mm")
                    : "Never"}
                </span>
              </div>

              {user.lockedUntil && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Locked Until</span>
                  <span className="text-orange-600">
                    {format(new Date(user.lockedUntil), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
              )}

              {user.mustChangePassword && (
                <div className="flex items-center gap-2 text-orange-600">
                  <Shield className="h-4 w-4" />
                  <span>Must change password on login</span>
                </div>
              )}

              {user.company && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Company</span>
                  <span className="text-slate-900">{user.company.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status change dialog */}
      <Dialog
        open={statusDialog.isOpen}
        onOpenChange={(open) =>
          !open && setStatusDialog((prev) => ({ ...prev, isOpen: false }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusDialog.targetStatus === "DEACTIVATED" && "Deactivate User"}
              {statusDialog.targetStatus === "SUSPENDED" && "Suspend User"}
              {statusDialog.targetStatus === "ACTIVE" && "Reactivate User"}
            </DialogTitle>
            <DialogDescription>
              {statusDialog.targetStatus === "DEACTIVATED" &&
                "This will permanently deactivate the user account and revoke all active sessions."}
              {statusDialog.targetStatus === "SUSPENDED" &&
                "This will temporarily suspend the user account and revoke all active sessions."}
              {statusDialog.targetStatus === "ACTIVE" &&
                "This will reactivate the user account, allowing them to log in again."}
            </DialogDescription>
          </DialogHeader>

          {(statusDialog.targetStatus === "DEACTIVATED" ||
            statusDialog.targetStatus === "SUSPENDED") && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={statusDialog.reason}
                onChange={(e) =>
                  setStatusDialog((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Enter reason for status change..."
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setStatusDialog({ isOpen: false, targetStatus: null, reason: "" })
              }
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={
                statusDialog.targetStatus === "DEACTIVATED"
                  ? "destructive"
                  : statusDialog.targetStatus === "SUSPENDED"
                  ? "default"
                  : "default"
              }
              onClick={handleStatusChange}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {statusDialog.targetStatus === "DEACTIVATED" && "Deactivate"}
              {statusDialog.targetStatus === "SUSPENDED" && "Suspend"}
              {statusDialog.targetStatus === "ACTIVE" && "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
