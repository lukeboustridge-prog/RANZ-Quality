"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MICRO_CREDENTIAL_STATUS_LABELS,
  ORG_MEMBER_ROLE_LABELS,
} from "@/types";
import type { MicroCredentialStatus, OrgMemberRole } from "@/types";
import {
  GraduationCap,
  Users,
  Award,
  BookOpen,
  Upload,
  CheckCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

const STATUS_COLORS: Record<MicroCredentialStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700",
  IN_TRAINING: "bg-blue-100 text-blue-700",
  ASSESSMENT_PENDING: "bg-yellow-100 text-yellow-700",
  AWARDED: "bg-green-100 text-green-700",
  EXPIRED: "bg-red-100 text-red-700",
};

interface CredentialDefinition {
  id: string;
  title: string;
  level: number;
  skillStandard: string | null;
  issuingBody: string;
}

interface StaffCredential {
  id: string;
  status: string;
  awardedAt: string | null;
  expiryDate: string | null;
  certificateKey: string | null;
  certificateFileName: string | null;
  definition: CredentialDefinition;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  microCredentials: StaffCredential[];
}

function formatDate(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CredentialsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetCredentialIdRef = useRef<string | null>(null);

  async function fetchCredentials() {
    try {
      const response = await fetch("/api/credentials");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/onboarding";
          return;
        }
        throw new Error("Failed to fetch credentials");
      }
      const data = await response.json();
      setMembers(data.members);
    } catch (err) {
      console.error("Failed to fetch credentials:", err);
      setError("Failed to load credentials data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCredentials();
  }, []);

  function handleUploadClick(credentialId: string) {
    targetCredentialIdRef.current = credentialId;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const credentialId = targetCredentialIdRef.current;

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!file || !credentialId) return;

    setUploadingId(credentialId);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/credentials/${credentialId}/evidence`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Upload failed");
        return;
      }

      // Refresh data to show updated certificate info
      await fetchCredentials();
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload certificate. Please try again.");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleViewCertificate(credentialId: string) {
    setDownloadingId(credentialId);
    try {
      const response = await fetch(
        `/api/credentials/${credentialId}/evidence`
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to get certificate");
        return;
      }

      const data = await response.json();
      window.open(data.url, "_blank");
    } catch (err) {
      console.error("Failed to get certificate:", err);
      setError("Failed to retrieve certificate. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[var(--ranz-charcoal)]" />
            Staff Credentials
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your team&apos;s micro-credential status
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg" />
            ))}
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate aggregate stats
  const allCredentials = members.flatMap((m) => m.microCredentials);
  const totalAssigned = allCredentials.length;
  const awardedCount = allCredentials.filter(
    (c) => c.status === "AWARDED"
  ).length;
  const inProgressCount = allCredentials.filter(
    (c) => c.status === "IN_TRAINING" || c.status === "ASSESSMENT_PENDING"
  ).length;

  // Empty state: no staff at all
  if (members.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[var(--ranz-charcoal)]" />
            Staff Credentials
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your team&apos;s micro-credential status
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">
              No staff members found. Add staff members to track their
              credentials.
            </p>
            <Link
              href="/staff"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Go to Staff Management
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state: staff exist but no credentials assigned
  if (totalAssigned === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[var(--ranz-charcoal)]" />
            Staff Credentials
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your team&apos;s micro-credential status
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              No micro-credentials have been assigned to your staff yet.
              Credentials are managed by RANZ administration.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleFileSelected}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-[var(--ranz-charcoal)]" />
          Staff Credentials
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          View your team&apos;s micro-credential status
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Assigned</p>
                <p className="text-2xl font-bold text-slate-900">
                  {totalAssigned}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Awarded</p>
                <p className="text-2xl font-bold text-slate-900">
                  {awardedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-slate-900">
                  {inProgressCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff credential list - grouped by staff member */}
      <div className="space-y-4">
        {members.map((member) => {
          const hasCredentials = member.microCredentials.length > 0;

          return (
            <Card key={member.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {member.firstName} {member.lastName}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {
                        ORG_MEMBER_ROLE_LABELS[
                          member.role as OrgMemberRole
                        ]
                      }
                    </Badge>
                  </div>
                  {hasCredentials && (
                    <span className="text-xs text-slate-400">
                      {member.microCredentials.length} credential
                      {member.microCredentials.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!hasCredentials ? (
                  <p className="text-sm text-slate-400">
                    No credentials assigned
                  </p>
                ) : (
                  <div className="space-y-3">
                    {member.microCredentials.map((cred) => {
                      const isAwarded = cred.status === "AWARDED";
                      const hasCertificate = !!cred.certificateKey;
                      const isUploading = uploadingId === cred.id;
                      const isDownloading = downloadingId === cred.id;

                      return (
                        <div
                          key={cred.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {cred.definition.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-white"
                                >
                                  Level {cred.definition.level}
                                </Badge>
                                <span className="text-xs text-slate-400">
                                  {cred.definition.issuingBody}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Evidence upload/download for AWARDED credentials */}
                            {isAwarded && (
                              <>
                                {hasCertificate ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        handleViewCertificate(cred.id)
                                      }
                                      disabled={isDownloading}
                                      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 hover:underline"
                                      title="View Certificate"
                                    >
                                      {isDownloading ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-3.5 w-3.5" />
                                      )}
                                      <span className="max-w-[120px] truncate">
                                        {cred.certificateFileName}
                                      </span>
                                    </button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs text-slate-500"
                                      onClick={() =>
                                        handleUploadClick(cred.id)
                                      }
                                      disabled={isUploading}
                                    >
                                      {isUploading ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3.5 w-3.5" />
                                      )}
                                      <span className="ml-1">Replace</span>
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                      handleUploadClick(cred.id)
                                    }
                                    disabled={isUploading}
                                  >
                                    {isUploading ? (
                                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    ) : (
                                      <Upload className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Upload Certificate
                                  </Button>
                                )}
                              </>
                            )}

                            {/* Date info */}
                            {cred.status === "AWARDED" && cred.awardedAt && (
                              <span className="text-xs text-slate-400">
                                Awarded {formatDate(cred.awardedAt)}
                              </span>
                            )}
                            {cred.status === "AWARDED" && cred.expiryDate && (
                              <span className="text-xs text-slate-400">
                                Expires {formatDate(cred.expiryDate)}
                              </span>
                            )}
                            <Badge
                              className={
                                STATUS_COLORS[
                                  cred.status as MicroCredentialStatus
                                ]
                              }
                            >
                              {
                                MICRO_CREDENTIAL_STATUS_LABELS[
                                  cred.status as MicroCredentialStatus
                                ]
                              }
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
