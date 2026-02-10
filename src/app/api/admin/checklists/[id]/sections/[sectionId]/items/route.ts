import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const createItemSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  itemType: z.enum(["CHECKBOX", "TEXT_INPUT", "PHOTO_REQUIRED", "SIGNATURE"]).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateItemSchema = z.object({
  itemId: z.string().min(1),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  itemType: z.enum(["CHECKBOX", "TEXT_INPUT", "PHOTO_REQUIRED", "SIGNATURE"]).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
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

    const { id, sectionId } = await params;

    // Verify section exists and belongs to template
    const section = await db.checklistSection.findFirst({
      where: { id: sectionId, templateId: id },
      include: { items: { select: { sortOrder: true } } },
    });

    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Auto-set sortOrder to max+1 if not provided
    const sortOrder =
      parsed.data.sortOrder ??
      (section.items.length > 0
        ? Math.max(...section.items.map((i) => i.sortOrder)) + 1
        : 0);

    const item = await db.checklistItem.create({
      data: {
        sectionId,
        title: parsed.data.title,
        description: parsed.data.description,
        itemType: parsed.data.itemType ?? "CHECKBOX",
        isRequired: parsed.data.isRequired ?? true,
        sortOrder,
      },
    });

    await createAuditLog({
      action: "CREATE",
      resourceType: "ChecklistItem",
      resourceId: item.id,
      newState: {
        sectionId,
        title: item.title,
        itemType: item.itemType,
        isRequired: item.isRequired,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Failed to create checklist item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
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

    const { id, sectionId } = await params;

    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { itemId, ...updateData } = parsed.data;

    const existing = await db.checklistItem.findFirst({
      where: {
        id: itemId,
        sectionId,
        section: { templateId: id },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    const updated = await db.checklistItem.update({
      where: { id: itemId },
      data: updateData,
    });

    await createAuditLog({
      action: "UPDATE",
      resourceType: "ChecklistItem",
      resourceId: itemId,
      previousState: {
        title: existing.title,
        itemType: existing.itemType,
        isRequired: existing.isRequired,
      },
      newState: {
        title: updated.title,
        itemType: updated.itemType,
        isRequired: updated.isRequired,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update checklist item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
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

    const { id, sectionId } = await params;

    const itemId = req.nextUrl.searchParams.get("itemId");
    if (!itemId) {
      return NextResponse.json(
        { error: "itemId query parameter required" },
        { status: 400 }
      );
    }

    const existing = await db.checklistItem.findFirst({
      where: {
        id: itemId,
        sectionId,
        section: { templateId: id },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    await db.checklistItem.delete({
      where: { id: itemId },
    });

    await createAuditLog({
      action: "DELETE",
      resourceType: "ChecklistItem",
      resourceId: itemId,
      previousState: {
        sectionId,
        title: existing.title,
        itemType: existing.itemType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete checklist item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
