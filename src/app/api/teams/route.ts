import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const createTeamSchema = z.object({
  name: z
    .string()
    .min(3, "Team name must be at least 3 characters")
    .max(100, "Team name must be at most 100 characters"),
  description: z.string().max(500).optional(),
});

export async function GET() {
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

    const teams = await db.team.findMany({
      where: { organizationId: organization.id },
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
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, description } = parsed.data;

    const team = await db.team.create({
      data: {
        organizationId: organization.id,
        name: name.trim(),
        description: description?.trim() || null,
      },
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
          },
        },
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error: unknown) {
    // Handle unique constraint violation (duplicate team name)
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
    console.error("Failed to create team:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
