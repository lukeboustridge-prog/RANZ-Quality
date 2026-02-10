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

// --- PATCH: Toggle/update item completion ---

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization, userId } = ctx;
    const { id: instanceId, itemId } = await params;
    const body = await request.json();
    const { completed, textValue, notes } = body;

    // Verify instance belongs to this org
    const instance = await db.checklistInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance || instance.organizationId !== organization.id) {
      return NextResponse.json(
        { error: "Checklist instance not found" },
        { status: 404 }
      );
    }

    // Verify the item exists and belongs to the template
    const item = await db.checklistItem.findUnique({
      where: { id: itemId },
      include: { section: { include: { template: true } } },
    });

    if (!item || item.section.template.id !== instance.templateId) {
      return NextResponse.json(
        { error: "Checklist item not found" },
        { status: 404 }
      );
    }

    // Build the update data
    const updateData: {
      completed?: boolean;
      completedAt?: Date | null;
      completedBy?: string | null;
      textValue?: string | null;
      notes?: string | null;
    } = {};

    if (typeof completed === "boolean") {
      updateData.completed = completed;
      if (completed) {
        updateData.completedAt = new Date();
        updateData.completedBy = userId;
      } else {
        updateData.completedAt = null;
        updateData.completedBy = null;
      }
    }

    if (textValue !== undefined) {
      updateData.textValue = textValue || null;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    // Upsert the completion record
    const completion = await db.checklistItemCompletion.upsert({
      where: {
        instanceId_itemId: {
          instanceId,
          itemId,
        },
      },
      create: {
        instanceId,
        itemId,
        ...updateData,
      },
      update: updateData,
    });

    // Check if all required items are now completed to auto-complete/uncomplete instance
    const allCompletions = await db.checklistItemCompletion.findMany({
      where: { instanceId },
      include: {
        item: { select: { isRequired: true } },
      },
    });

    const requiredCompletions = allCompletions.filter(
      (c) => c.item.isRequired
    );
    const allRequiredDone = requiredCompletions.every((c) => c.completed);

    if (allRequiredDone && !instance.completedAt) {
      // Auto-set completedAt when all required items are done
      await db.checklistInstance.update({
        where: { id: instanceId },
        data: { completedAt: new Date() },
      });
    } else if (!allRequiredDone && instance.completedAt) {
      // Clear completedAt if an item was uncompleted
      await db.checklistInstance.update({
        where: { id: instanceId },
        data: { completedAt: null },
      });
    }

    // Compute updated stats
    const totalItems = allCompletions.length;
    const completedItems = allCompletions.filter((c) =>
      c.id === completion.id ? completion.completed : c.completed
    ).length;
    const requiredItems = requiredCompletions.length;
    const completedRequired = requiredCompletions.filter((c) =>
      c.id === completion.id ? completion.completed : c.completed
    ).length;
    const percentage =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return NextResponse.json({
      completion,
      stats: {
        totalItems,
        completedItems,
        requiredItems,
        completedRequired,
        percentage,
      },
    });
  } catch (error) {
    console.error("Failed to update checklist item completion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
