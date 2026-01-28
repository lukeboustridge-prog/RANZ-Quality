import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createProject, getOrganizationProjects } from "@/lib/projects";
import { z } from "zod/v4";

const createProjectSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.email().optional(),
  clientPhone: z.string().optional(),
  siteAddress: z.string().min(1, "Site address is required"),
  city: z.string().optional(),
  region: z.string().optional(),
  consentNumber: z.string().optional(),
  startDate: z.string().transform((s) => new Date(s)),
  completionDate: z.string().transform((s) => new Date(s)).optional(),
  projectType: z.enum([
    "NEW_BUILD",
    "REROOF",
    "REPAIR",
    "MAINTENANCE",
    "INSPECTION",
    "WARRANTY_CLAIM",
    "OTHER",
  ]),
  roofingSystem: z.string().optional(),
  description: z.string().optional(),
  warrantyYears: z.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as
      | "DRAFT"
      | "IN_PROGRESS"
      | "COMPLETED"
      | "ON_HOLD"
      | "CANCELLED"
      | undefined;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await getOrganizationProjects(organization.id, {
      status,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
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

    const body = await req.json();
    const validatedData = createProjectSchema.parse(body);

    const project = await createProject({
      organizationId: organization.id,
      ...validatedData,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to create project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
