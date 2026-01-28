"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  versionId?: string;
  onSuccess?: () => void;
}

export function ApprovalDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  versionId,
  onSuccess,
}: ApprovalDialogProps) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!action) return;

    if (action === "reject" && !reason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    startTransition(async () => {
      setError(null);

      try {
        const response = await fetch(`/api/documents/${documentId}/approve`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            versionId,
            reason: action === "reject" ? reason : undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to process approval");
        }

        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  const handleClose = () => {
    setAction(null);
    setReason("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Review Document</DialogTitle>
          <DialogDescription>
            Approve or reject &quot;{documentTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        {!action ? (
          <div className="flex gap-4 py-4">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => setAction("approve")}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => setAction("reject")}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        ) : (
          <div className="py-4">
            {action === "approve" ? (
              <div className="text-center py-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-slate-600">
                  This document will be marked as approved and made available
                  for use.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Rejection Reason *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Please explain why this document is being rejected..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {action ? (
            <>
              <Button variant="outline" onClick={() => setAction(null)} disabled={isPending}>
                Back
              </Button>
              <LoadingButton
                onClick={handleSubmit}
                loading={isPending}
                loadingText={action === "approve" ? "Approving..." : "Rejecting..."}
                className={
                  action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : ""
                }
                variant={action === "reject" ? "destructive" : "default"}
              >
                Confirm {action === "approve" ? "Approval" : "Rejection"}
              </LoadingButton>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Submit for approval dialog
interface SubmitApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  versionId?: string;
  onSuccess?: () => void;
}

export function SubmitApprovalDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  versionId,
  onSuccess,
}: SubmitApprovalDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    startTransition(async () => {
      setError(null);

      try {
        const response = await fetch(`/api/documents/${documentId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to submit for approval");
        }

        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit for Approval</DialogTitle>
          <DialogDescription>
            Submit &quot;{documentTitle}&quot; for review and approval.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-slate-600 text-sm">
            Once submitted, this document will be reviewed by an administrator.
            You will be notified when the review is complete.
          </p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            loading={isPending}
            loadingText="Submitting..."
          >
            Submit for Approval
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
