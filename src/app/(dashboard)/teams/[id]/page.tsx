"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TEAM_ROLE_LABELS, ORG_MEMBER_ROLE_LABELS } from "@/types";
import type { TeamRole, OrgMemberRole } from "@/types";
import {
  ArrowLeft,
  AlertTriangle,
  Info,
  Loader2,
  Trash2,
  UserPlus,
  Crown,
  FolderKanban,
  Link2,
  Unlink,
  X,
  Pencil,
  Check,
} from "lucide-react";

// ---------- Types ----------

interface TeamProject {
  id: string;
  projectNumber: string;
  clientName: string;
  siteAddress: string;
  status: string;
}

interface CredentialDefinition {
  id: string;
  title: string;
  level: number;
}

interface StaffCredential {
  id: string;
  status: string;
  definition: CredentialDefinition;
}

interface OrgMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  microCredentials: StaffCredential[];
}

interface TeamMemberData {
  id: string;
  role: TeamRole;
  isLead: boolean;
  memberId: string;
  member: OrgMember;
}

interface Warning {
  type: "NO_QUALIFIED_ROOFER" | "LEAD_NO_SUPERVISION" | "NO_LEAD_DESIGNATED";
  message: string;
}

interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  projectId: string | null;
  members: TeamMemberData[];
  project: TeamProject | null;
}

interface ProjectOption {
  id: string;
  projectNumber: string;
  clientName: string;
  siteAddress: string;
  status: string;
}

// ---------- Constants ----------

const ROLE_COLORS: Record<TeamRole, string> = {
  QUALIFIED_ROOFER: "bg-green-100 text-green-700",
  ADVANCING_ROOFER: "bg-blue-100 text-blue-700",
  APPRENTICE: "bg-yellow-100 text-yellow-700",
};

const TEAM_ROLES: TeamRole[] = [
  "QUALIFIED_ROOFER",
  "ADVANCING_ROOFER",
  "APPRENTICE",
];

// ---------- Component ----------

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Team state
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit name state
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Add member state
  const [allMembers, setAllMembers] = useState<OrgMember[]>([]);
  const [addMemberId, setAddMemberId] = useState("");
  const [addRole, setAddRole] = useState<TeamRole>("QUALIFIED_ROOFER");
  const [addIsLead, setAddIsLead] = useState(false);
  const [adding, setAdding] = useState(false);

  // Project linking state
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [linking, setLinking] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // ---------- Data Fetching ----------

  async function fetchTeam() {
    try {
      const response = await fetch(`/api/teams/${id}`);
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/onboarding";
          return;
        }
        if (response.status === 404) {
          setError("Team not found.");
          return;
        }
        throw new Error("Failed to fetch team");
      }
      const data = await response.json();
      setTeam(data.team);
      setWarnings(data.warnings || []);
      setEditName(data.team.name);
      setEditDescription(data.team.description || "");
    } catch (err) {
      console.error("Failed to fetch team:", err);
      setError("Failed to load team details.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrgMembers() {
    try {
      const response = await fetch("/api/credentials");
      if (!response.ok) return;
      const data = await response.json();
      setAllMembers(data.members || []);
    } catch (err) {
      console.error("Failed to fetch org members:", err);
    }
  }

  async function fetchProjects() {
    try {
      const response = await fetch("/api/projects?limit=100");
      if (!response.ok) return;
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  }

  useEffect(() => {
    if (id) {
      fetchTeam();
      fetchOrgMembers();
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- Handlers ----------

  async function handleSaveName() {
    if (!editName.trim() || editName.trim().length < 3) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to update team");
        return;
      }
      setEditingName(false);
      await fetchTeam();
    } catch (err) {
      console.error("Failed to update team:", err);
      setError("Failed to update team.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this team? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to delete team");
        return;
      }
      router.push("/teams");
    } catch (err) {
      console.error("Failed to delete team:", err);
      setError("Failed to delete team.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddMember() {
    if (!addMemberId) return;
    setAdding(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: addMemberId,
          role: addRole,
          isLead: addIsLead,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to add member");
        return;
      }
      setAddMemberId("");
      setAddRole("QUALIFIED_ROOFER");
      setAddIsLead(false);
      await fetchTeam();
    } catch (err) {
      console.error("Failed to add member:", err);
      setError("Failed to add member.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!window.confirm("Remove this member from the team?")) return;
    setError(null);
    try {
      const response = await fetch(
        `/api/teams/${id}/members?memberId=${memberId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to remove member");
        return;
      }
      await fetchTeam();
    } catch (err) {
      console.error("Failed to remove member:", err);
      setError("Failed to remove member.");
    }
  }

  async function handleUpdateMember(
    memberId: string,
    updates: { role?: TeamRole; isLead?: boolean }
  ) {
    setError(null);
    try {
      const response = await fetch(`/api/teams/${id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, ...updates }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to update member");
        return;
      }
      await fetchTeam();
    } catch (err) {
      console.error("Failed to update member:", err);
      setError("Failed to update member.");
    }
  }

  async function handleLinkProject() {
    if (!selectedProjectId) return;
    setLinking(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to link project");
        return;
      }
      setSelectedProjectId("");
      await fetchTeam();
    } catch (err) {
      console.error("Failed to link project:", err);
      setError("Failed to link project.");
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlinkProject() {
    setLinking(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: null }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to unlink project");
        return;
      }
      await fetchTeam();
    } catch (err) {
      console.error("Failed to unlink project:", err);
      setError("Failed to unlink project.");
    } finally {
      setLinking(false);
    }
  }

  // ---------- Computed Values ----------

  const teamMemberIds = team?.members.map((m) => m.memberId) || [];
  const availableMembers = allMembers.filter(
    (m) => !teamMemberIds.includes(m.id)
  );

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/teams"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Teams
        </Link>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 rounded-lg w-1/3" />
          <div className="h-64 bg-slate-200 rounded-lg" />
          <div className="h-48 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-6">
        <Link
          href="/teams"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Teams
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">{error || "Team not found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/teams"
        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Teams
      </Link>

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

      {/* Header section */}
      <div className="flex items-start justify-between">
        {editingName ? (
          <div className="space-y-3 flex-1 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Team Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                minLength={3}
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveName} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span className="ml-1">Save</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingName(false);
                  setEditName(team.name);
                  setEditDescription(team.description || "");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{team.name}</h1>
              <button
                onClick={() => setEditingName(true)}
                className="text-slate-400 hover:text-slate-600"
                title="Edit team"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            {team.description && (
              <p className="mt-1 text-sm text-slate-500">{team.description}</p>
            )}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span className="ml-1">Delete Team</span>
        </Button>
      </div>

      {/* Warnings section */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div
              key={w.type}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                w.type === "NO_LEAD_DESIGNATED"
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              {w.type === "NO_LEAD_DESIGNATED" ? (
                <Info className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Team Members section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Team Members ({team.members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing members */}
          {team.members.length === 0 ? (
            <p className="text-sm text-slate-400">
              No members assigned yet. Add team members below.
            </p>
          ) : (
            <div className="space-y-2">
              {team.members.map((tm) => (
                <div
                  key={tm.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {tm.member.firstName} {tm.member.lastName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {ORG_MEMBER_ROLE_LABELS[tm.member.role as OrgMemberRole]}
                        </Badge>
                        {tm.isLead && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Lead
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Role select */}
                    <select
                      value={tm.role}
                      onChange={(e) =>
                        handleUpdateMember(tm.memberId, {
                          role: e.target.value as TeamRole,
                        })
                      }
                      className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                    >
                      {TEAM_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {TEAM_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <Badge className={`text-xs ${ROLE_COLORS[tm.role as TeamRole]}`}>
                      {TEAM_ROLE_LABELS[tm.role as TeamRole]}
                    </Badge>
                    {/* Toggle lead */}
                    {!tm.isLead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-slate-500"
                        onClick={() =>
                          handleUpdateMember(tm.memberId, { isLead: true })
                        }
                        title="Set as team lead"
                      >
                        <Crown className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {/* Remove */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemoveMember(tm.memberId)}
                      title="Remove from team"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add member form */}
          {availableMembers.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Add Member
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-slate-500 mb-1">
                    Staff Member
                  </label>
                  <select
                    value={addMemberId}
                    onChange={(e) => setAddMemberId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white"
                  >
                    <option value="">Select a staff member...</option>
                    {availableMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} (
                        {ORG_MEMBER_ROLE_LABELS[m.role as OrgMemberRole]})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Team Role
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as TeamRole)}
                    className="text-sm border border-slate-300 rounded-md px-3 py-2 bg-white"
                  >
                    {TEAM_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {TEAM_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="add-is-lead"
                    checked={addIsLead}
                    onChange={(e) => setAddIsLead(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="add-is-lead" className="text-xs text-slate-600">
                    Set as Lead
                  </label>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddMember}
                  disabled={adding || !addMemberId}
                >
                  {adding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  <span className="ml-1">Add</span>
                </Button>
              </div>
            </div>
          )}
          {availableMembers.length === 0 && allMembers.length > 0 && (
            <p className="text-xs text-slate-400 mt-2">
              All staff members are already assigned to this team.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Project Linking section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Linked Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          {team.project ? (
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
              <div className="flex items-center gap-3">
                <Link2 className="h-4 w-4 text-slate-400" />
                <div>
                  <Link
                    href={`/projects/${team.project.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {team.project.projectNumber} - {team.project.clientName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {team.project.siteAddress}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={handleUnlinkProject}
                disabled={linking}
              >
                {linking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                <span className="ml-1">Unlink</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-slate-500 mb-1">
                  Link to Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white"
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectNumber} - {p.clientName} ({p.siteAddress})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                onClick={handleLinkProject}
                disabled={linking || !selectedProjectId}
              >
                {linking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                <span className="ml-1">Link</span>
              </Button>
            </div>
          )}
          {projects.length === 0 && !team.project && (
            <p className="text-xs text-slate-400 mt-2">
              No projects available.{" "}
              <Link href="/projects" className="text-blue-600 hover:underline">
                Create a project first
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
