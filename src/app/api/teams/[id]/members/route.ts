import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

async function getOrgAndTeam(teamId: string) {
  const { orgId } = await auth();
  if (!orgId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (!organization) {
    return {
      error: NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      ),
    };
  }

  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team || team.organizationId !== organization.id) {
    return {
      error: NextResponse.json({ error: "Team not found" }, { status: 404 }),
    };
  }

  return { organization, team };
}

const addMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  role: z.enum(["QUALIFIED_ROOFER", "ADVANCING_ROOFER", "APPRENTICE"]),
  isLead: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getOrgAndTeam(id);
    if ("error" in result && result.error) return result.error;
    const { organization, team } = result as {
      organization: { id: string };
      team: { id: string };
    };

    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { memberId, role, isLead } = parsed.data;

    // Verify member belongs to the same org
    const orgMember = await db.organizationMember.findFirst({
      where: { id: memberId, organizationId: organization.id },
    });

    if (!orgMember) {
      return NextResponse.json(
        { error: "Staff member not found in your organisation" },
        { status: 404 }
      );
    }

    // If isLead is true, unset any existing lead on this team
    if (isLead) {
      await db.teamMember.updateMany({
        where: { teamId: team.id, isLead: true },
        data: { isLead: false },
      });
    }

    const teamMember = await db.teamMember.create({
      data: {
        teamId: team.id,
        memberId,
        role,
        isLead: isLead || false,
      },
      include: {
        member: true,
      },
    });

    return NextResponse.json({ teamMember }, { status: 201 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This member is already assigned to this team" },
        { status: 409 }
      );
    }
    console.error("Failed to add team member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getOrgAndTeam(id);
    if ("error" in result && result.error) return result.error;
    const { team } = result as { team: { id: string } };

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    const teamMember = await db.teamMember.findUnique({
      where: {
        teamId_memberId: {
          teamId: team.id,
          memberId,
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    await db.teamMember.delete({
      where: { id: teamMember.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  role: z.enum(["QUALIFIED_ROOFER", "ADVANCING_ROOFER", "APPRENTICE"]).optional(),
  isLead: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getOrgAndTeam(id);
    if ("error" in result && result.error) return result.error;
    const { team } = result as { team: { id: string } };

    const body = await request.json();
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { memberId, role, isLead } = parsed.data;

    const teamMember = await db.teamMember.findUnique({
      where: {
        teamId_memberId: {
          teamId: team.id,
          memberId,
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // If setting as lead, unset existing lead first
    if (isLead) {
      await db.teamMember.updateMany({
        where: { teamId: team.id, isLead: true },
        data: { isLead: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;
    if (isLead !== undefined) updateData.isLead = isLead;

    const updated = await db.teamMember.update({
      where: { id: teamMember.id },
      data: updateData,
      include: {
        member: true,
      },
    });

    return NextResponse.json({ teamMember: updated });
  } catch (error) {
    console.error("Failed to update team member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
