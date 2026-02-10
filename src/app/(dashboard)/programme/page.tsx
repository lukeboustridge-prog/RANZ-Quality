import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROGRAMME_ENROLMENT_STATUS_LABELS } from "@/types";
import type { ProgrammeEnrolmentStatus } from "@/types";
import { Award, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";

const statusConfig: Record<
  ProgrammeEnrolmentStatus,
  { color: string; icon: React.ReactNode }
> = {
  PENDING: {
    color: "bg-yellow-100 text-yellow-700",
    icon: <Clock className="h-4 w-4" />,
  },
  ACTIVE: {
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  RENEWAL_DUE: {
    color: "bg-amber-100 text-amber-700",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  SUSPENDED: {
    color: "bg-red-100 text-red-700",
    icon: <XCircle className="h-4 w-4" />,
  },
  WITHDRAWN: {
    color: "bg-slate-100 text-slate-700",
    icon: <XCircle className="h-4 w-4" />,
  },
};

function formatDate(date: Date | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ProgrammePage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: { programmeEnrolment: true },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  const enrolment = organization.programmeEnrolment;
  const showApplyButton = !enrolment || enrolment.status === "WITHDRAWN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          RoofWright Programme
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your organisation&apos;s RoofWright programme enrolment
        </p>
      </div>

      {showApplyButton ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[var(--ranz-charcoal)]" />
              RoofWright Programme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              The RoofWright programme is RANZ&apos;s quality certification
              initiative for roofing businesses. Enrolled organisations
              demonstrate their commitment to excellence through verified
              compliance, professional standards, and ongoing quality
              improvement.
            </p>
            <div className="space-y-2">
              <h3 className="font-medium text-slate-900">
                Programme Benefits
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                <li>
                  Public verification of your business through the RANZ
                  portal
                </li>
                <li>
                  Enhanced credibility with clients and industry partners
                </li>
                <li>
                  Access to the RANZ quality framework and compliance tools
                </li>
                <li>
                  Annual certification review and continuous improvement
                  support
                </li>
                <li>
                  Eligibility for RANZ digital credentials and badges
                </li>
              </ul>
            </div>
            <div className="pt-2">
              <Link href="/programme/apply">
                <Button>Apply to Enrol</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[var(--ranz-charcoal)]" />
              Enrolment Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                className={`flex items-center gap-1 ${statusConfig[enrolment.status as ProgrammeEnrolmentStatus].color}`}
              >
                {statusConfig[enrolment.status as ProgrammeEnrolmentStatus].icon}
                {PROGRAMME_ENROLMENT_STATUS_LABELS[enrolment.status as ProgrammeEnrolmentStatus]}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Applied
                </p>
                <p className="text-sm text-slate-900">
                  {formatDate(enrolment.appliedAt)}
                </p>
              </div>
              {enrolment.activeSince && (
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Active Since
                  </p>
                  <p className="text-sm text-slate-900">
                    {formatDate(enrolment.activeSince)}
                  </p>
                </div>
              )}
              {enrolment.anniversaryDate && (
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Anniversary Date
                  </p>
                  <p className="text-sm text-slate-900">
                    {formatDate(enrolment.anniversaryDate)}
                  </p>
                </div>
              )}
            </div>

            {enrolment.status === "PENDING" && (
              <div className="rounded-md bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  Your application is under review by RANZ. You will be
                  notified once a decision has been made.
                </p>
              </div>
            )}

            {enrolment.status === "ACTIVE" && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">
                  Your organisation is enrolled in the RoofWright programme.
                  Your next anniversary date is{" "}
                  {formatDate(enrolment.anniversaryDate)}.
                </p>
              </div>
            )}

            {enrolment.status === "RENEWAL_DUE" && (
              <div className="rounded-md bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  Your annual renewal is due. Please ensure your compliance
                  documentation is up to date. Your anniversary date is{" "}
                  {formatDate(enrolment.anniversaryDate)}.
                </p>
              </div>
            )}

            {enrolment.status === "SUSPENDED" && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">
                  Your enrolment has been suspended.
                  {enrolment.suspendedReason && (
                    <>
                      {" "}
                      Reason: {enrolment.suspendedReason}
                    </>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
