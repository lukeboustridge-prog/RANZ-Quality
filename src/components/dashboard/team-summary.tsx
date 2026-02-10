import Link from "next/link";
import { UsersRound, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeamSummaryData {
  totalTeams: number;
  totalMembers: number;
  teams: Array<{
    id: string;
    name: string;
    memberCount: number;
    qualifiedCount: number;
    advancingCount: number;
    apprenticeCount: number;
    hasQualifiedRoofer: boolean;
    hasDesignatedLead: boolean;
    projectLinked: boolean;
  }>;
}

export function TeamSummary({ data }: { data: TeamSummaryData | null }) {
  if (!data || data.totalTeams === 0) {
    return null;
  }

  const teamsToShow = data.teams.slice(0, 5);
  const hasMore = data.teams.length > 5;

  const totals = data.teams.reduce(
    (acc, t) => ({
      qualified: acc.qualified + t.qualifiedCount,
      advancing: acc.advancing + t.advancingCount,
      apprentice: acc.apprentice + t.apprenticeCount,
    }),
    { qualified: 0, advancing: 0, apprentice: 0 }
  );

  const teamsWithWarnings = data.teams.filter(
    (t) => !t.hasQualifiedRoofer || !t.hasDesignatedLead
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <UsersRound className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle>Team Composition</CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">
                {data.totalTeams} team{data.totalTeams !== 1 ? "s" : ""},{" "}
                {data.totalMembers} member{data.totalMembers !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-slate-100">
          {teamsToShow.map((team) => {
            const ratioStatus = getRatioStatus(
              team.qualifiedCount,
              team.apprenticeCount
            );
            const hasWarning =
              !team.hasQualifiedRoofer || !team.hasDesignatedLead;

            return (
              <li key={team.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/teams/${team.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors truncate"
                      >
                        {team.name}
                      </Link>
                      {hasWarning && (
                        <span
                          className="flex-shrink-0 h-2 w-2 rounded-full bg-amber-500"
                          title={getWarningTitle(team)}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {team.qualifiedCount > 0 && (
                        <Badge
                          variant="success"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {team.qualifiedCount} QR
                        </Badge>
                      )}
                      {team.advancingCount > 0 && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-800 border-transparent">
                          {team.advancingCount} AR
                        </Badge>
                      )}
                      {team.apprenticeCount > 0 && (
                        <Badge
                          variant="warning"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {team.apprenticeCount} App
                        </Badge>
                      )}
                      {team.memberCount === 0 && (
                        <span className="text-[10px] text-slate-400">
                          No members
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        ratioStatus === "healthy" && "text-green-600",
                        ratioStatus === "unhealthy" && "text-amber-600",
                        ratioStatus === "critical" && "text-red-600",
                        ratioStatus === "none" && "text-slate-400"
                      )}
                    >
                      {ratioStatus !== "none"
                        ? `Q:A = ${team.qualifiedCount}:${team.apprenticeCount}`
                        : "--"}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {hasMore && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Link
              href="/teams"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all {data.totalTeams} teams
            </Link>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-slate-500">
              {totals.qualified} Qualified, {totals.advancing} Advancing,{" "}
              {totals.apprentice} Apprentice
            </p>
            {teamsWithWarnings.length > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-600">
                  {teamsWithWarnings.length} team
                  {teamsWithWarnings.length !== 1 ? "s" : ""} need
                  {teamsWithWarnings.length === 1 ? "s" : ""} attention
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getRatioStatus(
  qualifiedCount: number,
  apprenticeCount: number
): "healthy" | "unhealthy" | "critical" | "none" {
  if (apprenticeCount === 0 && qualifiedCount === 0) return "none";
  if (apprenticeCount === 0) return "healthy";
  if (qualifiedCount === 0) return "critical";
  if (apprenticeCount > qualifiedCount * 2) return "unhealthy";
  return "healthy";
}

function getWarningTitle(team: {
  hasQualifiedRoofer: boolean;
  hasDesignatedLead: boolean;
}): string {
  const warnings: string[] = [];
  if (!team.hasQualifiedRoofer) warnings.push("No qualified roofer");
  if (!team.hasDesignatedLead) warnings.push("No designated lead");
  return warnings.join(", ");
}
