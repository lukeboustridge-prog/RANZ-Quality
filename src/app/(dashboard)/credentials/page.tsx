import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MICRO_CREDENTIAL_STATUS_LABELS,
  ORG_MEMBER_ROLE_LABELS,
} from "@/types";
import type { MicroCredentialStatus, OrgMemberRole } from "@/types";
import { GraduationCap, Users, Award, BookOpen } from "lucide-react";

const STATUS_COLORS: Record<MicroCredentialStatus, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700",
  IN_TRAINING: "bg-blue-100 text-blue-700",
  ASSESSMENT_PENDING: "bg-yellow-100 text-yellow-700",
  AWARDED: "bg-green-100 text-green-700",
  EXPIRED: "bg-red-100 text-red-700",
};

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CredentialsPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      members: {
        include: {
          microCredentials: {
            include: {
              definition: true,
            },
            orderBy: { definition: { title: "asc" } },
          },
        },
        orderBy: [{ role: "asc" }, { firstName: "asc" }],
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  const { members } = organization;

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
                    {member.microCredentials.map((cred) => (
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
                    ))}
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
