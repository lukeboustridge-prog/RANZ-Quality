"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TEAM_ROLE_LABELS } from "@/types";
import type { TeamRole } from "@/types";
import { Users, Loader2, Plus, FolderKanban } from "lucide-react";

interface TeamProject {
  id: string;
  projectNumber: string;
  clientName: string;
}

interface TeamMemberData {
  id: string;
  role: string;
  isLead: boolean;
  member: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  members: TeamMemberData[];
  project: TeamProject | null;
  createdAt: string;
}

function getRoleBreakdown(members: TeamMemberData[]): string {
  const counts: Partial<Record<TeamRole, number>> = {};
  for (const m of members) {
    const role = m.role as TeamRole;
    counts[role] = (counts[role] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([role, count]) => `${count} ${TEAM_ROLE_LABELS[role as TeamRole]}`)
    .join(", ");
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function fetchTeams() {
    try {
      const response = await fetch("/api/teams");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/onboarding";
          return;
        }
        throw new Error("Failed to fetch teams");
      }
      const data = await response.json();
      setTeams(data.teams);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
      setError("Failed to load teams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTeams();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create team");
        return;
      }

      setName("");
      setDescription("");
      await fetchTeams();
    } catch (err) {
      console.error("Failed to create team:", err);
      setError("Failed to create team. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-[var(--ranz-charcoal)]" />
            Teams
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your roofing teams and their composition
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-slate-200 rounded-lg" />
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-[var(--ranz-charcoal)]" />
          Teams
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your roofing teams and their composition
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

      {/* Create team form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label
                htmlFor="team-name"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Team Name
              </label>
              <input
                id="team-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Team Alpha"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                required
                minLength={3}
                maxLength={100}
              />
            </div>
            <div>
              <label
                htmlFor="team-description"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Description{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="team-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes about this team..."
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                maxLength={500}
              />
            </div>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Teams list */}
      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              No teams yet. Create your first team above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`} className="block">
              <Card className="hover:border-slate-400 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">
                          {team.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {team.members.length} member
                          {team.members.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      {team.description && (
                        <p className="text-sm text-slate-500">
                          {team.description}
                        </p>
                      )}
                      {team.members.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getRoleBreakdown(team.members)
                            .split(", ")
                            .map((part) => (
                              <Badge
                                key={part}
                                variant="secondary"
                                className="text-xs"
                              >
                                {part}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {team.project && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <FolderKanban className="h-3.5 w-3.5" />
                          <span>
                            {team.project.projectNumber} -{" "}
                            {team.project.clientName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
