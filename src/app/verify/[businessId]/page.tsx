import { notFound } from "next/navigation";
import { format } from "date-fns";
import { db } from "@/lib/db";
import {
  CheckCircle,
  Shield,
  Users,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CERTIFICATION_TIER_LABELS,
  COMPLIANCE_THRESHOLDS,
  type CertificationTier,
} from "@/types";

interface PageProps {
  params: Promise<{ businessId: string }>;
}

const tierColors: Record<CertificationTier, string> = {
  ACCREDITED: "bg-slate-100 text-slate-700 border-slate-300",
  CERTIFIED: "bg-blue-100 text-blue-700 border-blue-300",
  MASTER_ROOFER: "bg-amber-100 text-amber-700 border-amber-300",
};

const tierDescriptions: Record<CertificationTier, string> = {
  ACCREDITED:
    "This business meets RANZ baseline quality standards for roofing services.",
  CERTIFIED:
    "This business has demonstrated compliance with RANZ ISO 9000-style quality management standards.",
  MASTER_ROOFER:
    "This business has achieved the highest level of RANZ certification, demonstrating exceptional quality management and industry leadership.",
};

export default async function VerifyPage({ params }: PageProps) {
  const { businessId } = await params;

  const organization = await db.organization.findUnique({
    where: { id: businessId },
    include: {
      insurancePolicies: {
        where: { expiryDate: { gt: new Date() } },
        select: { policyType: true, expiryDate: true },
      },
      _count: {
        select: { members: true },
      },
      audits: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { completedAt: true, rating: true },
      },
    },
  });

  if (!organization) {
    notFound();
  }

  const hasPublicLiability = organization.insurancePolicies.some(
    (p) => p.policyType === "PUBLIC_LIABILITY"
  );
  const hasProfessionalIndemnity = organization.insurancePolicies.some(
    (p) => p.policyType === "PROFESSIONAL_INDEMNITY"
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-slate-900">RANZ Portal</span>
          </div>
          <span className="text-sm text-slate-500">Certification Verification</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Verification Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-green-900">
                Verified RANZ Member
              </h1>
              <p className="text-green-700 mt-1">
                This business is a verified member of the Roofing Association of
                New Zealand.
              </p>
            </div>
          </div>
        </div>

        {/* Business Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{organization.name}</CardTitle>
                {organization.tradingName && (
                  <p className="text-slate-500 mt-1">
                    Trading as: {organization.tradingName}
                  </p>
                )}
              </div>
              <Badge
                className={`text-base px-3 py-1 ${tierColors[organization.certificationTier]}`}
              >
                {CERTIFICATION_TIER_LABELS[organization.certificationTier]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              {tierDescriptions[organization.certificationTier]}
            </p>

            {organization.nzbn && (
              <p className="text-sm text-slate-500 mt-4">
                NZBN: {organization.nzbn}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Verification Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Compliance Score */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div
                  className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    organization.complianceScore >= COMPLIANCE_THRESHOLDS.COMPLIANT
                      ? "bg-green-100"
                      : organization.complianceScore >= COMPLIANCE_THRESHOLDS.AT_RISK
                        ? "bg-yellow-100"
                        : "bg-red-100"
                  }`}
                >
                  <span
                    className={`text-xl font-bold ${
                      organization.complianceScore >= COMPLIANCE_THRESHOLDS.COMPLIANT
                        ? "text-green-700"
                        : organization.complianceScore >= COMPLIANCE_THRESHOLDS.AT_RISK
                          ? "text-yellow-700"
                          : "text-red-700"
                    }`}
                  >
                    {organization.complianceScore}%
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Compliance Score</p>
                  <p className="text-sm text-slate-500">
                    {organization.complianceScore >= COMPLIANCE_THRESHOLDS.COMPLIANT
                      ? "Fully compliant"
                      : organization.complianceScore >= COMPLIANCE_THRESHOLDS.AT_RISK
                        ? "Mostly compliant"
                        : "Action required"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Member Since */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Member Since</p>
                  <p className="text-sm text-slate-500">
                    {organization.certifiedSince
                      ? format(new Date(organization.certifiedSince), "MMMM yyyy")
                      : "Recently joined"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insurance & Staff */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Verification Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Insurance */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-slate-400" />
                  <span>Public Liability Insurance</span>
                </div>
                {hasPublicLiability ? (
                  <Badge className="bg-green-100 text-green-700">Current</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Not Current</Badge>
                )}
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-slate-400" />
                  <span>Professional Indemnity Insurance</span>
                </div>
                {hasProfessionalIndemnity ? (
                  <Badge className="bg-green-100 text-green-700">Current</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Not Current</Badge>
                )}
              </div>

              {/* Staff */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-slate-400" />
                  <span>Registered Staff</span>
                </div>
                <span className="text-slate-600">
                  {organization._count.members} members
                </span>
              </div>

              {/* Last Audit */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <span>Last Audit</span>
                </div>
                <span className="text-slate-600">
                  {organization.audits[0]
                    ? format(
                        new Date(organization.audits[0].completedAt),
                        "MMM yyyy"
                      )
                    : "Pending"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About RANZ */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium text-slate-900 mb-2">
              About RANZ Certification
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              The Roofing Association of New Zealand (RANZ) certifies roofing
              businesses that meet strict quality standards. Certified members
              must demonstrate:
            </p>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside mb-4">
              <li>Current insurance coverage</li>
              <li>Licensed Building Practitioner (LBP) credentials</li>
              <li>Quality management system documentation</li>
              <li>Regular compliance audits</li>
            </ul>
            <a
              href="https://ranz.org.nz"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                Learn More About RANZ
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Verification Timestamp */}
        <p className="text-center text-sm text-slate-400 mt-8">
          Verified on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
        </p>
      </main>
    </div>
  );
}
