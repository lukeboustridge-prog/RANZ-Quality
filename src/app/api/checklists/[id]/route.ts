import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// --- Helpers ---

async function getOrgFromClerk() {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) return null;

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (!organization) return null;
  return { organization, userId };
}

// --- GET: Instance detail with full template tree and completion data ---

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = ctx;
    const { id } = await params;

    const instance = await db.checklistInstance.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            sections: {
              include: {
                items: {
                  orderBy: { sortOrder: "asc" },
                },
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        project: {
          select: {
            id: true,
            projectNumber: true,
            clientName: true,
            siteAddress: true,
          },
        },
        completions: true,
      },
    });

    if (!instance || instance.organizationId !== organization.id) {
      return NextResponse.json(
        { error: "Checklist instance not found" },
        { status: 404 }
      );
    }

    // Build a map of completions by itemId
    const completionMap = new Map(
      instance.completions.map((c) => [c.itemId, c])
    );

    // Compute stats
    let totalItems = 0;
    let completedItems = 0;
    let requiredItems = 0;
    let completedRequired = 0;

    // Enrich template tree with completion data
    const sections = instance.template.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        totalItems++;
        if (item.isRequired) requiredItems++;

        const completion = completionMap.get(item.id);
        if (completion?.completed) {
          completedItems++;
          if (item.isRequired) completedRequired++;
        }

        return {
          ...item,
          completion: completion
            ? {
                id: completion.id,
                completed: completion.completed,
                textValue: completion.textValue,
                notes: completion.notes,
                photoKey: completion.photoKey,
                photoFileName: completion.photoFileName,
                completedAt: completion.completedAt,
                completedBy: completion.completedBy,
              }
            : null,
        };
      }),
    }));

    const percentage =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return NextResponse.json({
      instance: {
        id: instance.id,
        templateId: instance.templateId,
        projectId: instance.projectId,
        organizationId: instance.organizationId,
        startedAt: instance.startedAt,
        completedAt: instance.completedAt,
        createdBy: instance.createdBy,
      },
      template: {
        id: instance.template.id,
        title: instance.template.title,
        description: instance.template.description,
      },
      project: instance.project,
      sections,
      stats: {
        totalItems,
        completedItems,
        requiredItems,
        completedRequired,
        percentage,
      },
    });
  } catch (error) {
    console.error("Failed to fetch checklist instance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --- POST: Create a new checklist instance ---

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization, userId } = ctx;
    const { id: routeId } = await params;
    const body = await request.json();
    const { templateId, projectId } = body;

    // Use templateId from body (matches the plan: POST to /api/checklists/[id])
    const actualTemplateId = templateId || routeId;

    if (!actualTemplateId || !projectId) {
      return NextResponse.json(
        { error: "templateId and projectId are required" },
        { status: 400 }
      );
    }

    // Verify template belongs to this org or is a master template
    const template = await db.checklistTemplate.findUnique({
      where: { id: actualTemplateId },
      include: {
        sections: {
          include: {
            items: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (!template.isMaster && template.organizationId !== organization.id) {
      return NextResponse.json(
        { error: "Template does not belong to your organisation" },
        { status: 403 }
      );
    }

    // Verify project belongs to this org
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.organizationId !== organization.id) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check unique constraint: one instance per template per project
    const existing = await db.checklistInstance.findUnique({
      where: {
        templateId_projectId: {
          templateId: actualTemplateId,
          projectId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "A checklist for this template and project already exists.",
        },
        { status: 409 }
      );
    }

    // Collect all items from the template
    const allItems = template.sections.flatMap((s) => s.items);

    // Create instance and pre-create completion records in a transaction
    const instance = await db.$transaction(async (tx) => {
      const newInstance = await tx.checklistInstance.create({
        data: {
          templateId: actualTemplateId,
          projectId,
          organizationId: organization.id,
          createdBy: userId,
        },
      });

      // Pre-create completion records for ALL items
      if (allItems.length > 0) {
        await tx.checklistItemCompletion.createMany({
          data: allItems.map((item) => ({
            instanceId: newInstance.id,
            itemId: item.id,
            completed: false,
          })),
        });
      }

      return newInstance;
    });

    return NextResponse.json({ instance }, { status: 201 });
  } catch (error) {
    console.error("Failed to create checklist instance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --- PATCH: Mark instance as completed ---

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = ctx;
    const { id } = await params;
    const body = await request.json();

    if (body.action !== "complete") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const instance = await db.checklistInstance.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            sections: {
              include: {
                items: { where: { isRequired: true } },
              },
            },
          },
        },
        completions: true,
      },
    });

    if (!instance || instance.organizationId !== organization.id) {
      return NextResponse.json(
        { error: "Checklist instance not found" },
        { status: 404 }
      );
    }

    // Check all required items are completed
    const requiredItemIds = instance.template.sections.flatMap((s) =>
      s.items.map((item) => item.id)
    );

    const completionMap = new Map(
      instance.completions.map((c) => [c.itemId, c])
    );

    const incompleteRequired = requiredItemIds.filter((itemId) => {
      const completion = completionMap.get(itemId);
      return !completion?.completed;
    });

    if (incompleteRequired.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot mark as complete. ${incompleteRequired.length} required item(s) are still outstanding.`,
          incompleteCount: incompleteRequired.length,
        },
        { status: 400 }
      );
    }

    const updated = await db.checklistInstance.update({
      where: { id },
      data: { completedAt: new Date() },
    });

    return NextResponse.json({ instance: updated });
  } catch (error) {
    console.error("Failed to complete checklist instance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --- DELETE: Delete a checklist instance ---

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = ctx;
    const { id } = await params;

    const instance = await db.checklistInstance.findUnique({
      where: { id },
    });

    if (!instance || instance.organizationId !== organization.id) {
      return NextResponse.json(
        { error: "Checklist instance not found" },
        { status: 404 }
      );
    }

    await db.checklistInstance.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete checklist instance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
