"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PolicyCard } from "./policy-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { InsurancePolicyType } from "@/types";

interface Policy {
  id: string;
  policyType: InsurancePolicyType;
  policyNumber: string;
  insurer: string;
  coverageAmount: string | number;
  expiryDate: Date | string;
  verified: boolean;
}

interface PolicyListProps {
  policies: Policy[];
}

export function PolicyList({ policies }: PolicyListProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/insurance/${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete policy:", error);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (policies.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {policies.map((policy) => (
          <PolicyCard
            key={policy.id}
            policy={policy}
            onDelete={(id) => setDeleteId(id)}
          />
        ))}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Insurance Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this insurance policy? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
