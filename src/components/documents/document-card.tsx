"use client";

import Link from "next/link";
import {
  FileText,
  Download,
  MoreVertical,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ISO_ELEMENT_LABELS,
  DOCUMENT_TYPE_LABELS,
  type ISOElement,
  type DocumentType,
} from "@/types";

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    isoElement: ISOElement;
    documentType: DocumentType;
    fileName?: string | null;
    fileSize?: number | null;
    uploadedAt: Date | string;
    uploadedBy: string;
    storageKey?: string | null;
  };
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
}

export function DocumentCard({
  document,
  onDelete,
  onDownload,
}: DocumentCardProps) {
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">
              {document.title}
            </h3>
            <p className="text-sm text-slate-500">
              {ISO_ELEMENT_LABELS[document.isoElement]}
            </p>
            {document.fileName && (
              <p className="text-xs text-slate-400 mt-1">
                {document.fileName}
                {document.fileSize && ` (${formatFileSize(document.fileSize)})`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {DOCUMENT_TYPE_LABELS[document.documentType]}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {document.storageKey && onDownload && (
                <DropdownMenuItem onClick={() => onDownload(document.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(document.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
        <span>Uploaded {formatDate(document.uploadedAt)}</span>
      </div>
    </div>
  );
}
