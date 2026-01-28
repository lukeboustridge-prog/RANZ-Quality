"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MemberCard } from "./member-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { OrgMemberRole, LBPClass } from "@/types";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: OrgMemberRole;
  lbpNumber?: string | null;
  lbpClass?: LBPClass | null;
  lbpVerified: boolean;
}

interface MemberListProps {
  members: Member[];
}

export function MemberList({ members }: MemberListProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/staff/${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete member:", error);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (members.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onDelete={(id) => setDeleteId(id)}
          />
        ))}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this staff member? They will lose
              access to the portal.
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
              {isDeleting ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
