import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const updateChecklistItemSchema = z.object({
  itemId: z.string(),
  response: z
    .enum([
      "CONFORMING",
      "MINOR_NONCONFORMITY",
      "MAJOR_NONCONFORMITY",
      "OBSERVATION",
      "NOT_APPLICABLE",
    ])
    .optional(),
  finding: z.string().optional(),
  severity: z.enum(["OBSERVATION", "MINOR", "MAJOR", "CRITICAL"]).optional(),
  auditorNotes: z.string().optional(),
  evidenceKeys: z.array(z.string()).optional(),
});

const bulkUpdateSchema = z.object({
  items: z.array(updateChecklistItemSchema),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: auditId } = await params;

    const audit = await db.audit.findFirst({
      where: {
        id: auditId,
        organization: { clerkOrgId: orgId },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    const checklist = await db.auditChecklist.findMany({
      where: { auditId },
      orderBy: [{ isoElement: "asc" }, { questionNumber: "asc" }],
    });

    // Group by ISO element
    const grouped: Record<string, typeof checklist> = {};
    for (const item of checklist) {
      if (!grouped[item.isoElement]) {
        grouped[item.isoElement] = [];
      }
      grouped[item.isoElement].push(item);
    }

    return NextResponse.json({
      checklist,
      grouped,
      statistics: {
        total: checklist.length,
        answered: checklist.filter((c) => c.response).length,
        conforming: checklist.filter((c) => c.response === "CONFORMING").length,
        nonConformities: checklist.filter(
          (c) =>
            c.response === "MINOR_NONCONFORMITY" ||
            c.response === "MAJOR_NONCONFORMITY"
        ).length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch checklist:", error);
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
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: auditId } = await params;

    const audit = await db.audit.findFirst({
      where: {
        id: auditId,
        organization: { clerkOrgId: orgId },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    if (audit.status === "COMPLETED" || audit.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot modify completed or cancelled audit" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = bulkUpdateSchema.parse(body);

    // Update each item in a transaction
    await db.$transaction(
      data.items.map((item) =>
        db.auditChecklist.update({
          where: { id: item.itemId },
          data: {
            response: item.response,
            finding: item.finding,
            severity: item.severity,
            auditorNotes: item.auditorNotes,
            evidenceKeys: item.evidenceKeys,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update checklist:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
