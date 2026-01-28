"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileText, Check, X, Clock, AlertCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DOCUMENT_VERSION_STATUS_LABELS,
  type DocumentVersionStatus,
} from "@/types";

interface Version {
  id: string;
  versionString: string;
  versionNumber: number;
  minorVersion: number;
  status: DocumentVersionStatus;
  fileName: string;
  fileSize: number;
  createdAt: string;
  createdBy: string;
  changeNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

interface VersionHistoryProps {
  documentId: string;
  onVersionSelect?: (version: Version) => void;
  onDownload?: (version: Version) => void;
}

const statusConfig: Record<
  DocumentVersionStatus,
  { color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    color: "bg-gray-100 text-gray-700",
    icon: <FileText className="h-3 w-3" />,
  },
  PENDING_APPROVAL: {
    color: "bg-yellow-100 text-yellow-700",
    icon: <Clock className="h-3 w-3" />,
  },
  APPROVED: {
    color: "bg-green-100 text-green-700",
    icon: <Check className="h-3 w-3" />,
  },
  REJECTED: {
    color: "bg-red-100 text-red-700",
    icon: <X className="h-3 w-3" />,
  },
  SUPERSEDED: {
    color: "bg-slate-100 text-slate-500",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VersionHistory({
  documentId,
  onVersionSelect,
  onDownload,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVersions() {
      try {
        const response = await fetch(`/api/documents/${documentId}/versions`);
        if (!response.ok) {
          throw new Error("Failed to fetch versions");
        }
        const data = await response.json();
        setVersions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchVersions();
  }, [documentId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse h-16 bg-slate-100 rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-red-600">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500">
        <FileText className="h-8 w-8 mx-auto mb-2" />
        <p>No versions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version, index) => {
        const config = statusConfig[version.status];
        const isLatest = index === 0;

        return (
          <div
            key={version.id}
            className={`p-4 rounded-lg border ${
              isLatest ? "border-blue-200 bg-blue-50" : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    isLatest ? "bg-blue-100" : "bg-slate-100"
                  }`}
                >
                  <span className="text-sm font-medium">
                    v{version.versionString}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{version.fileName}</span>
                    {isLatest && (
                      <Badge className="bg-blue-600">Latest</Badge>
                    )}
                    <Badge className={config.color}>
                      {config.icon}
                      <span className="ml-1">
                        {DOCUMENT_VERSION_STATUS_LABELS[version.status]}
                      </span>
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {formatFileSize(version.fileSize)} •{" "}
                    {formatDistanceToNow(new Date(version.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {onDownload && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownload(version)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {onVersionSelect && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onVersionSelect(version)}
                  >
                    View
                  </Button>
                )}
              </div>
            </div>

            {version.changeNotes && (
              <div className="mt-3 text-sm text-slate-600 bg-white rounded p-2 border border-slate-100">
                <span className="font-medium">Changes:</span>{" "}
                {version.changeNotes}
              </div>
            )}

            {version.status === "REJECTED" && version.rejectionReason && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 rounded p-2 border border-red-100">
                <span className="font-medium">Rejection reason:</span>{" "}
                {version.rejectionReason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
