import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
});

const DEFAULT_CHECKLIST = {
  title: "RoofWright Client Process Checklist",
  description:
    "Standard client process workflow for RoofWright programme members. Covers the complete project lifecycle from initial contact through to completion.",
  isDefault: true,
  isMaster: true,
  sections: [
    {
      title: "Initial Contact",
      sortOrder: 0,
      items: [
        { title: "Record client name and contact details", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 0 },
        { title: "Confirm site address and access requirements", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 1 },
        { title: "Identify project scope and client expectations", itemType: "TEXT_INPUT" as const, isRequired: true, sortOrder: 2 },
        { title: "Take initial site photos", itemType: "PHOTO_REQUIRED" as const, isRequired: true, sortOrder: 3 },
        { title: "Provide estimated timeline", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 4 },
      ],
    },
    {
      title: "Quoting",
      sortOrder: 1,
      items: [
        { title: "Complete site measurement and assessment", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 0 },
        { title: "Document existing roof condition", itemType: "PHOTO_REQUIRED" as const, isRequired: true, sortOrder: 1 },
        { title: "Select materials and specify product codes", itemType: "TEXT_INPUT" as const, isRequired: true, sortOrder: 2 },
        { title: "Calculate labour and material costs", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 3 },
        { title: "Issue written quote to client", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 4 },
        { title: "Record client acceptance or follow-up required", itemType: "TEXT_INPUT" as const, isRequired: false, sortOrder: 5 },
      ],
    },
    {
      title: "Site Setup",
      sortOrder: 2,
      items: [
        { title: "Verify building consent status", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 0 },
        { title: "Confirm health and safety plan in place", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 1 },
        { title: "Set up site access and scaffolding", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 2 },
        { title: "Brief team on project scope and safety", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 3 },
        { title: "Photo of site setup before work begins", itemType: "PHOTO_REQUIRED" as const, isRequired: true, sortOrder: 4 },
      ],
    },
    {
      title: "Execution",
      sortOrder: 3,
      items: [
        { title: "Strip existing roof covering (if applicable)", itemType: "CHECKBOX" as const, isRequired: false, sortOrder: 0 },
        { title: "Install underlay and flashings", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 1 },
        { title: "Install roof cladding per manufacturer spec", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 2 },
        { title: "Complete penetration and ridge details", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 3 },
        { title: "Progress photos at key milestones", itemType: "PHOTO_REQUIRED" as const, isRequired: true, sortOrder: 4 },
        { title: "Daily site cleanup and waste management", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 5 },
      ],
    },
    {
      title: "Completion",
      sortOrder: 4,
      items: [
        { title: "Final quality inspection completed", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 0 },
        { title: "Photo of completed roof", itemType: "PHOTO_REQUIRED" as const, isRequired: true, sortOrder: 1 },
        { title: "Client walkthrough and sign-off", itemType: "SIGNATURE" as const, isRequired: true, sortOrder: 2 },
        { title: "Issue warranty documentation", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 3 },
        { title: "Submit Record of Work to council", itemType: "CHECKBOX" as const, isRequired: true, sortOrder: 4 },
        { title: "Request client feedback/rating", itemType: "CHECKBOX" as const, isRequired: false, sortOrder: 5 },
      ],
    },
  ],
};

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metadata = sessionClaims?.metadata as { role?: string } | undefined;
    const userRole = metadata?.role;
    if (userRole !== "ranz:admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Auto-seed default checklist if none exist
    const defaultCount = await db.checklistTemplate.count({
      where: { isDefault: true },
    });

    if (defaultCount === 0) {
      await db.checklistTemplate.create({
        data: {
          title: DEFAULT_CHECKLIST.title,
          description: DEFAULT_CHECKLIST.description,
          isDefault: DEFAULT_CHECKLIST.isDefault,
          isMaster: DEFAULT_CHECKLIST.isMaster,
          sections: {
            create: DEFAULT_CHECKLIST.sections.map((section) => ({
              title: section.title,
              sortOrder: section.sortOrder,
              items: {
                create: section.items.map((item) => ({
                  title: item.title,
                  itemType: item.itemType,
                  isRequired: item.isRequired,
                  sortOrder: item.sortOrder,
                })),
              },
            })),
          },
        },
      });
    }

    const templates = await db.checklistTemplate.findMany({
      where: { isMaster: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        _count: {
          select: { instances: true },
        },
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch checklist templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metadata = sessionClaims?.metadata as { role?: string } | undefined;
    const userRole = metadata?.role;
    if (userRole !== "ranz:admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const template = await db.checklistTemplate.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        isMaster: true,
        isDefault: false,
      },
    });

    await createAuditLog({
      action: "CREATE",
      resourceType: "ChecklistTemplate",
      resourceId: template.id,
      newState: {
        title: template.title,
        description: template.description,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Failed to create checklist template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
