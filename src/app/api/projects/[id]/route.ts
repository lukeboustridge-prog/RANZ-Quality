import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getProjectWithDetails, updateProjectStatus } from "@/lib/projects";
import { z } from "zod/v4";

const updateProjectSchema = z.object({
  clientName: z.string().min(1).optional(),
  clientEmail: z.email().optional(),
  clientPhone: z.string().optional(),
  siteAddress: z.string().min(1).optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  consentNumber: z.string().optional(),
  startDate: z.string().transform((s) => new Date(s)).optional(),
  completionDate: z.string().transform((s) => new Date(s)).optional(),
  projectType: z.enum([
    "NEW_BUILD",
    "REROOF",
    "REPAIR",
    "MAINTENANCE",
    "INSPECTION",
    "WARRANTY_CLAIM",
    "OTHER",
  ]).optional(),
  roofingSystem: z.string().optional(),
  description: z.string().optional(),
  warrantyYears: z.number().int().min(0).optional(),
  status: z.enum([
    "DRAFT",
    "IN_PROGRESS",
    "COMPLETED",
    "ON_HOLD",
    "CANCELLED",
  ]).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  clientFeedback: z.string().optional(),
  zeroLeaks: z.boolean().optional(),
  rowSubmitted: z.boolean().optional(),
  rowDate: z.string().transform((s) => new Date(s)).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const project = await getProjectWithDetails(id);

    if (!project || project.organizationId !== organization.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const existingProject = await db.project.findUnique({
      where: { id },
    });

    if (!existingProject || existingProject.organizationId !== organization.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = updateProjectSchema.parse(body);

    // Handle status update separately for completion date logic
    if (validatedData.status) {
      await updateProjectStatus(id, validatedData.status);
      delete validatedData.status;
    }

    // Update remaining fields
    const project = await db.project.update({
      where: { id },
      data: validatedData,
      include: {
        _count: {
          select: { photos: true, documents: true },
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to update project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const existingProject = await db.project.findUnique({
      where: { id },
    });

    if (!existingProject || existingProject.organizationId !== organization.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await db.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
