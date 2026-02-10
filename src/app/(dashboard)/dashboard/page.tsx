import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { daysUntil, formatDate } from "@/lib/utils";
import { calculateComplianceScore } from "@/lib/compliance-v2";
import { ComplianceScore } from "@/components/dashboard/compliance-score";
import { ActionItems } from "@/components/dashboard/action-items";
import { ExpiringItems } from "@/components/dashboard/expiring-items";
import { StatsCards, getDefaultStats } from "@/components/dashboard/stats-cards";
import { DimensionIndicators } from "@/components/dashboard/dimension-indicators";
import { ProgrammeBadge } from "@/components/dashboard/programme-badge";
import { TeamSummary } from "@/components/dashboard/team-summary";

export default async function DashboardPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      insurancePolicies: {
        orderBy: { expiryDate: "asc" },
      },
      members: true,
      documents: true,
      programmeEnrolment: {
        select: { status: true, activeSince: true, anniversaryDate: true },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  // Fetch team composition data
  const teams = await db.team.findMany({
    where: { organizationId: organization.id },
    include: {
      members: {
        select: { role: true, isLead: true },
      },
      project: {
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const teamSummaryData = {
    totalTeams: teams.length,
    totalMembers: teams.reduce((sum, t) => sum + t.members.length, 0),
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      memberCount: t.members.length,
      qualifiedCount: t.members.filter((m) => m.role === "QUALIFIED_ROOFER").length,
      advancingCount: t.members.filter((m) => m.role === "ADVANCING_ROOFER").length,
      apprenticeCount: t.members.filter((m) => m.role === "APPRENTICE").length,
      hasQualifiedRoofer: t.members.some((m) => m.role === "QUALIFIED_ROOFER"),
      hasDesignatedLead: t.members.some((m) => m.isLead),
      projectLinked: !!t.project,
    })),
  };

  // Calculate compliance with full breakdown
  const complianceResult = await calculateComplianceScore(organization.id);

  // Calculate expiring items
  const now = new Date();
  const expiringInsurance = organization.insurancePolicies
    .filter((p) => {
      const days = daysUntil(p.expiryDate);
      return days > 0 && days <= 90;
    })
    .map((p) => ({
      id: p.id,
      type: "insurance" as const,
      title: p.policyType.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" "),
      expiryDate: formatDate(p.expiryDate),
      daysRemaining: daysUntil(p.expiryDate),
      href: `/insurance/${p.id}`,
    }));

  // Build action items from compliance issues
  const actionItems = complianceResult.issues
    .filter((issue) => issue.severity === "critical" || issue.severity === "warning")
    .map((issue) => ({
      id: issue.code,
      title: issue.message,
      description: issue.actionRequired || "Review and address this issue",
      priority: issue.severity === "critical" ? "high" as const : "medium" as const,
      href: issue.category === "insurance" ? "/insurance" :
            issue.category === "personnel" ? "/staff" :
            issue.category === "documentation" ? "/documents" :
            issue.category === "audit" ? "/audits" : "/dashboard",
    }));

  const stats = getDefaultStats({
    insuranceCount: organization.insurancePolicies.length,
    staffCount: organization.members.length,
    documentCount: organization.documents.length,
    complianceScore: complianceResult.overallScore,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">
          Welcome back to {organization.name}
        </p>
      </div>

      <ProgrammeBadge enrolment={organization.programmeEnrolment} />

      <div className="motion-safe:animate-[fadeIn_0.4s_ease-out]">
        <StatsCards stats={stats} />
      </div>

      <DimensionIndicators breakdown={complianceResult.breakdown} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 motion-safe:animate-[fadeIn_0.5s_ease-out_0.1s_both]">
        <ComplianceScore
          score={complianceResult.overallScore}
          tier={organization.certificationTier}
        />
        <ExpiringItems items={expiringInsurance} />
      </div>

      <ActionItems items={actionItems} />

      <TeamSummary data={teamSummaryData.totalTeams > 0 ? teamSummaryData : null} />
    </div>
  );
}
