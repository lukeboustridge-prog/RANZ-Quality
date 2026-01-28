"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentCard } from "./document-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ISOElement, DocumentType } from "@/types";

interface Document {
  id: string;
  title: string;
  isoElement: ISOElement;
  documentType: DocumentType;
  fileName?: string | null;
  fileSize?: number | null;
  uploadedAt: Date | string;
  uploadedBy: string;
  storageKey?: string | null;
}

interface DocumentListProps {
  documents: Document[];
}

export function DocumentList({ documents }: DocumentListProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}/download`);
      if (res.ok) {
        const { url } = await res.json();
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Failed to get download URL:", error);
    }
  };

  if (documents.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onDelete={(id) => setDeleteId(id)}
            onDownload={handleDownload}
          />
        ))}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone.
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
