import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

interface Warning {
  type: "NO_QUALIFIED_ROOFER" | "LEAD_NO_SUPERVISION" | "NO_LEAD_DESIGNATED";
  message: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const { id } = await params;

    const team = await db.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            member: {
              include: {
                microCredentials: {
                  include: { definition: true },
                },
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            projectNumber: true,
            clientName: true,
            siteAddress: true,
            status: true,
          },
        },
      },
    });

    if (!team || team.organizationId !== organization.id) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Compute warnings
    const warnings: Warning[] = [];

    // Warning 1 (TEAM-03): No Qualified Roofer
    const hasQualifiedRoofer = team.members.some(
      (tm) => tm.role === "QUALIFIED_ROOFER"
    );
    if (team.members.length > 0 && !hasQualifiedRoofer) {
      warnings.push({
        type: "NO_QUALIFIED_ROOFER",
        message:
          "This team has no Qualified Roofer assigned. At least one team member should hold the Qualified Roofer role.",
      });
    }

    // Warning 2 (TEAM-04): Lead lacks supervision/mentoring credential
    const lead = team.members.find((tm) => tm.isLead);
    if (lead) {
      const hasSupervisionCredential = lead.member.microCredentials.some(
        (mc) =>
          mc.status === "AWARDED" &&
          (mc.definition.title.toLowerCase().includes("supervision") ||
            mc.definition.title.toLowerCase().includes("mentoring"))
      );
      if (!hasSupervisionCredential) {
        warnings.push({
          type: "LEAD_NO_SUPERVISION",
          message: `Team lead ${lead.member.firstName} ${lead.member.lastName} does not hold a supervision/mentoring qualification. Consider assigning a qualified team lead or adding the relevant credential.`,
        });
      }
    } else if (team.members.length > 0) {
      // No lead designated but team has members
      warnings.push({
        type: "NO_LEAD_DESIGNATED",
        message:
          "No team lead has been designated. Consider assigning a team lead.",
      });
    }

    return NextResponse.json({ team, warnings });
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateTeamSchema = z.object({
  name: z
    .string()
    .min(3, "Team name must be at least 3 characters")
    .max(100, "Team name must be at most 100 characters")
    .optional(),
  description: z.string().max(500).optional(),
  projectId: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const { id } = await params;

    const team = await db.team.findUnique({ where: { id } });
    if (!team || team.organizationId !== organization.id) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, description, projectId } = parsed.data;

    // If projectId is provided (not undefined), verify it belongs to the same org
    if (projectId !== undefined && projectId !== null) {
      const project = await db.project.findUnique({
        where: { id: projectId },
      });
      if (!project || project.organizationId !== organization.id) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description.trim() || null;
    if (projectId !== undefined) updateData.projectId = projectId;

    const updated = await db.team.update({
      where: { id },
      data: updateData,
      include: {
        members: {
          include: {
            member: true,
          },
        },
        project: {
          select: {
            id: true,
            projectNumber: true,
            clientName: true,
            siteAddress: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ team: updated });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A team with this name already exists in your organisation" },
        { status: 409 }
      );
    }
    console.error("Failed to update team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const { id } = await params;

    const team = await db.team.findUnique({ where: { id } });
    if (!team || team.organizationId !== organization.id) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    await db.team.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
