"use client";

import * as React from "react";
import { UserX, UserCheck, Shield, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUTH_USER_TYPES, type AuthUserTypeValue } from "@/lib/auth/constants";

interface BatchActionsProps {
  selectedIds: string[];
  onAction: (result: BatchActionResult) => void;
  onClear: () => void;
}

interface BatchActionResult {
  success: boolean;
  action: string;
  updated: number;
  failed: number;
  error?: string;
}

/**
 * BatchActions provides a toolbar for bulk user operations.
 * Appears when one or more users are selected in the table.
 */
export function BatchActions({ selectedIds, onAction, onClear }: BatchActionsProps) {
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [reactivateOpen, setReactivateOpen] = React.useState(false);
  const [roleOpen, setRoleOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [deactivateReason, setDeactivateReason] = React.useState("");
  const [newRole, setNewRole] = React.useState<AuthUserTypeValue | "">("");

  // Don't render if no selection
  if (selectedIds.length === 0) return null;

  /**
   * Execute batch action via API.
   */
  const executeBatchAction = async (
    action: "deactivate" | "reactivate" | "change_role",
    options?: { reason?: string; newRole?: AuthUserTypeValue }
  ) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/users/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userIds: selectedIds,
          ...options,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        onAction({
          success: false,
          action,
          updated: 0,
          failed: selectedIds.length,
          error: result.error || "Batch action failed",
        });
        return;
      }

      onAction({
        success: true,
        action: result.action,
        updated: result.updated,
        failed: result.failed,
      });

      // Close dialogs
      setDeactivateOpen(false);
      setReactivateOpen(false);
      setRoleOpen(false);
      setDeactivateReason("");
      setNewRole("");
    } catch (error) {
      onAction({
        success: false,
        action,
        updated: 0,
        failed: selectedIds.length,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <span className="text-sm font-medium text-blue-700">
          {selectedIds.length} selected
        </span>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeactivateOpen(true)}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <UserX className="h-4 w-4 mr-2" />
            Deactivate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setReactivateOpen(true)}
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Reactivate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRoleOpen(true)}
          >
            <Shield className="h-4 w-4 mr-2" />
            Change Role
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto">
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Deactivate confirmation dialog */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Users</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {selectedIds.length} user(s)? They will be
              logged out and unable to access the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Reason (optional)
              </label>
              <textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Enter reason for deactivation..."
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                executeBatchAction("deactivate", { reason: deactivateReason || undefined })
              }
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                `Deactivate ${selectedIds.length} User(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate confirmation dialog */}
      <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Users</DialogTitle>
            <DialogDescription>
              Are you sure you want to reactivate {selectedIds.length} user(s)? Only users
              with DEACTIVATED status will be affected.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => executeBatchAction("reactivate")}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reactivating...
                </>
              ) : (
                `Reactivate ${selectedIds.length} User(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change role dialog */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Select a new role for {selectedIds.length} user(s). This will update their
              permissions across all RANZ applications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">New Role</label>
              <Select
                value={newRole || undefined}
                onValueChange={(value) => setNewRole(value as AuthUserTypeValue)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(AUTH_USER_TYPES).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                executeBatchAction("change_role", { newRole: newRole as AuthUserTypeValue })
              }
              disabled={isLoading || !newRole}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                `Change Role for ${selectedIds.length} User(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
