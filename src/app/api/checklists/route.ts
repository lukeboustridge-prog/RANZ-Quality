import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

// --- Schemas ---

const cloneSchema = z.object({
  action: z.literal("clone"),
  templateId: z.string().min(1),
});

const addSectionSchema = z.object({
  action: z.literal("add-section"),
  templateId: z.string().min(1),
  title: z.string().min(1, "Section title is required"),
  description: z.string().optional(),
});

const addItemSchema = z.object({
  action: z.literal("add-item"),
  sectionId: z.string().min(1),
  title: z.string().min(1, "Item title is required"),
  description: z.string().optional(),
  itemType: z
    .enum(["CHECKBOX", "TEXT_INPUT", "PHOTO_REQUIRED", "SIGNATURE"])
    .optional(),
  isRequired: z.boolean().optional(),
});

const updateSectionSchema = z.object({
  action: z.literal("update-section"),
  sectionId: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const updateItemSchema = z.object({
  action: z.literal("update-item"),
  itemId: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  itemType: z
    .enum(["CHECKBOX", "TEXT_INPUT", "PHOTO_REQUIRED", "SIGNATURE"])
    .optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

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

// --- GET: List master templates, org templates, and org instances ---

export async function GET() {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = ctx;

    // 1. Master templates (for "Use This Template" button)
    const masterTemplates = await db.checklistTemplate.findMany({
      where: { isMaster: true },
      include: {
        sections: {
          include: { items: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 2. Org's customised templates
    const orgTemplates = await db.checklistTemplate.findMany({
      where: { organizationId: organization.id, isMaster: false },
      include: {
        sections: {
          include: { items: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 3. Active checklist instances for the org with completion counts
    const instances = await db.checklistInstance.findMany({
      where: { organizationId: organization.id },
      include: {
        template: { select: { id: true, title: true } },
        project: {
          select: {
            id: true,
            projectNumber: true,
            clientName: true,
          },
        },
        completions: {
          select: { completed: true },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    // Compute completion stats for each instance
    const instancesWithStats = instances.map((inst) => {
      const totalItems = inst.completions.length;
      const completedItems = inst.completions.filter((c) => c.completed).length;
      const percentage =
        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { completions, ...rest } = inst;
      return {
        ...rest,
        totalItems,
        completedItems,
        percentage,
      };
    });

    return NextResponse.json({
      masterTemplates,
      orgTemplates,
      instances: instancesWithStats,
    });
  } catch (error) {
    console.error("Failed to fetch checklists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --- POST: Clone, add-section, add-item ---

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = ctx;
    const body = await request.json();
    const action = body?.action;

    // --- Clone a master template ---
    if (action === "clone") {
      const parsed = cloneSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }

      const { templateId } = parsed.data;

      // Check if org already cloned this master
      const existing = await db.checklistTemplate.findFirst({
        where: {
          organizationId: organization.id,
          sourceTemplateId: templateId,
          isMaster: false,
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            error:
              "Your organisation has already customised this template. You can edit your existing copy.",
          },
          { status: 409 }
        );
      }

      // Load master template with all sections and items
      const master = await db.checklistTemplate.findUnique({
        where: { id: templateId },
        include: {
          sections: {
            include: { items: { orderBy: { sortOrder: "asc" } } },
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!master || !master.isMaster) {
        return NextResponse.json(
          { error: "Master template not found" },
          { status: 404 }
        );
      }

      // Clone: create template, sections, items in a transaction
      const cloned = await db.$transaction(async (tx) => {
        const newTemplate = await tx.checklistTemplate.create({
          data: {
            title: `${master.title} (Company)`,
            description: master.description,
            isMaster: false,
            isDefault: false,
            organizationId: organization.id,
            sourceTemplateId: master.id,
          },
        });

        for (const section of master.sections) {
          const newSection = await tx.checklistSection.create({
            data: {
              templateId: newTemplate.id,
              title: section.title,
              description: section.description,
              sortOrder: section.sortOrder,
            },
          });

          for (const item of section.items) {
            await tx.checklistItem.create({
              data: {
                sectionId: newSection.id,
                title: item.title,
                description: item.description,
                itemType: item.itemType,
                isRequired: item.isRequired,
                sortOrder: item.sortOrder,
              },
            });
          }
        }

        // Return the newly created template with full tree
        return tx.checklistTemplate.findUnique({
          where: { id: newTemplate.id },
          include: {
            sections: {
              include: { items: { orderBy: { sortOrder: "asc" } } },
              orderBy: { sortOrder: "asc" },
            },
          },
        });
      });

      return NextResponse.json({ template: cloned }, { status: 201 });
    }

    // --- Add section to org template ---
    if (action === "add-section") {
      const parsed = addSectionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }

      const { templateId, title, description } = parsed.data;

      // Verify template belongs to this org and is not master
      const template = await db.checklistTemplate.findUnique({
        where: { id: templateId },
      });

      if (
        !template ||
        template.organizationId !== organization.id ||
        template.isMaster
      ) {
        return NextResponse.json(
          { error: "Template not found or not editable" },
          { status: 404 }
        );
      }

      // Get max sortOrder
      const maxSection = await db.checklistSection.findFirst({
        where: { templateId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const section = await db.checklistSection.create({
        data: {
          templateId,
          title: title.trim(),
          description: description?.trim() || null,
          sortOrder: (maxSection?.sortOrder ?? -1) + 1,
        },
        include: { items: true },
      });

      return NextResponse.json({ section }, { status: 201 });
    }

    // --- Add item to section ---
    if (action === "add-item") {
      const parsed = addItemSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }

      const { sectionId, title, description, itemType, isRequired } =
        parsed.data;

      // Verify the section's template belongs to this org
      const section = await db.checklistSection.findUnique({
        where: { id: sectionId },
        include: { template: true },
      });

      if (
        !section ||
        section.template.organizationId !== organization.id ||
        section.template.isMaster
      ) {
        return NextResponse.json(
          { error: "Section not found or not editable" },
          { status: 404 }
        );
      }

      // Get max sortOrder
      const maxItem = await db.checklistItem.findFirst({
        where: { sectionId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const item = await db.checklistItem.create({
        data: {
          sectionId,
          title: title.trim(),
          description: description?.trim() || null,
          itemType: itemType || "CHECKBOX",
          isRequired: isRequired ?? true,
          sortOrder: (maxItem?.sortOrder ?? -1) + 1,
        },
      });

      return NextResponse.json({ item }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process checklist POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --- PATCH: Update section or item ---

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = ctx;
    const body = await request.json();
    const action = body?.action;

    if (action === "update-section") {
      const parsed = updateSectionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }

      const { sectionId, ...updates } = parsed.data;

      // Verify section belongs to org template
      const section = await db.checklistSection.findUnique({
        where: { id: sectionId },
        include: { template: true },
      });

      if (
        !section ||
        section.template.organizationId !== organization.id ||
        section.template.isMaster
      ) {
        return NextResponse.json(
          { error: "Section not found or not editable" },
          { status: 404 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { action: _, ...data } = updates;
      const updated = await db.checklistSection.update({
        where: { id: sectionId },
        data,
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });

      return NextResponse.json({ section: updated });
    }

    if (action === "update-item") {
      const parsed = updateItemSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }

      const { itemId, ...updates } = parsed.data;

      // Verify item belongs to org template
      const item = await db.checklistItem.findUnique({
        where: { id: itemId },
        include: { section: { include: { template: true } } },
      });

      if (
        !item ||
        item.section.template.organizationId !== organization.id ||
        item.section.template.isMaster
      ) {
        return NextResponse.json(
          { error: "Item not found or not editable" },
          { status: 404 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { action: _, ...data } = updates;
      const updated = await db.checklistItem.update({
        where: { id: itemId },
        data,
      });

      return NextResponse.json({ item: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process checklist PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --- DELETE: Remove section or item ---

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = ctx;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "delete-section") {
      const sectionId = searchParams.get("sectionId");
      if (!sectionId) {
        return NextResponse.json(
          { error: "sectionId is required" },
          { status: 400 }
        );
      }

      const section = await db.checklistSection.findUnique({
        where: { id: sectionId },
        include: { template: true },
      });

      if (
        !section ||
        section.template.organizationId !== organization.id ||
        section.template.isMaster
      ) {
        return NextResponse.json(
          { error: "Section not found or not deletable" },
          { status: 404 }
        );
      }

      await db.checklistSection.delete({ where: { id: sectionId } });
      return NextResponse.json({ success: true });
    }

    if (action === "delete-item") {
      const itemId = searchParams.get("itemId");
      if (!itemId) {
        return NextResponse.json(
          { error: "itemId is required" },
          { status: 400 }
        );
      }

      const item = await db.checklistItem.findUnique({
        where: { id: itemId },
        include: { section: { include: { template: true } } },
      });

      if (
        !item ||
        item.section.template.organizationId !== organization.id ||
        item.section.template.isMaster
      ) {
        return NextResponse.json(
          { error: "Item not found or not deletable" },
          { status: 404 }
        );
      }

      await db.checklistItem.delete({ where: { id: itemId } });
      return NextResponse.json({ success: true });
    }

    if (action === "delete-template") {
      const templateId = searchParams.get("templateId");
      if (!templateId) {
        return NextResponse.json(
          { error: "templateId is required" },
          { status: 400 }
        );
      }

      const template = await db.checklistTemplate.findUnique({
        where: { id: templateId },
      });

      if (
        !template ||
        template.organizationId !== organization.id ||
        template.isMaster
      ) {
        return NextResponse.json(
          { error: "Template not found or not deletable" },
          { status: 404 }
        );
      }

      await db.checklistTemplate.delete({ where: { id: templateId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process checklist DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
