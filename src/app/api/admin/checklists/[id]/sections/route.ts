import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const createSectionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateSectionSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Verify template exists
    const template = await db.checklistTemplate.findUnique({
      where: { id },
      include: { sections: { select: { sortOrder: true } } },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = createSectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Auto-set sortOrder to max+1 if not provided
    const sortOrder =
      parsed.data.sortOrder ??
      (template.sections.length > 0
        ? Math.max(...template.sections.map((s) => s.sortOrder)) + 1
        : 0);

    const section = await db.checklistSection.create({
      data: {
        templateId: id,
        title: parsed.data.title,
        description: parsed.data.description,
        sortOrder,
      },
    });

    await createAuditLog({
      action: "CREATE",
      resourceType: "ChecklistSection",
      resourceId: section.id,
      newState: {
        templateId: id,
        title: section.title,
        sortOrder: section.sortOrder,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error("Failed to create checklist section:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const body = await req.json();
    const parsed = updateSectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sectionId, ...updateData } = parsed.data;

    const existing = await db.checklistSection.findFirst({
      where: { id: sectionId, templateId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    const updated = await db.checklistSection.update({
      where: { id: sectionId },
      data: updateData,
    });

    await createAuditLog({
      action: "UPDATE",
      resourceType: "ChecklistSection",
      resourceId: sectionId,
      previousState: { title: existing.title, sortOrder: existing.sortOrder },
      newState: { title: updated.title, sortOrder: updated.sortOrder },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update checklist section:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const sectionId = req.nextUrl.searchParams.get("sectionId");
    if (!sectionId) {
      return NextResponse.json(
        { error: "sectionId query parameter required" },
        { status: 400 }
      );
    }

    const existing = await db.checklistSection.findFirst({
      where: { id: sectionId, templateId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    await db.checklistSection.delete({
      where: { id: sectionId },
    });

    await createAuditLog({
      action: "DELETE",
      resourceType: "ChecklistSection",
      resourceId: sectionId,
      previousState: {
        templateId: id,
        title: existing.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete checklist section:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
