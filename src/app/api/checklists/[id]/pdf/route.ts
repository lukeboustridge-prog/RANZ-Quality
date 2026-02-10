import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { ProcedureDocumentPDF } from "@/components/reports/pdf/procedure-document";
import { randomUUID } from "crypto";

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

// --- GET: Generate procedure document PDF ---

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = ctx;
    const { id } = await params;

    // Load checklist instance with full data
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
        project: true,
        organization: {
          select: {
            id: true,
            name: true,
            tradingName: true,
            nzbn: true,
            clerkOrgId: true,
          },
        },
        completions: true,
      },
    });

    if (!instance || instance.organization.clerkOrgId !== organization.clerkOrgId) {
      return NextResponse.json(
        { error: "Checklist instance not found" },
        { status: 404 }
      );
    }

    // Verify instance is completed
    if (!instance.completedAt) {
      return NextResponse.json(
        {
          error:
            "Checklist must be completed before generating a procedure document",
        },
        { status: 400 }
      );
    }

    // Build completion map
    const completionMap = new Map(
      instance.completions.map((c) => [c.itemId, c])
    );

    // Build stats
    let totalItems = 0;
    let completedItems = 0;

    // Assemble sections with completion data
    const sections = instance.template.sections.map((section) => ({
      title: section.title,
      description: section.description,
      items: section.items.map((item) => {
        totalItems++;
        const completion = completionMap.get(item.id);
        if (completion?.completed) completedItems++;

        return {
          title: item.title,
          description: item.description,
          itemType: item.itemType,
          isRequired: item.isRequired,
          completed: completion?.completed || false,
          textValue: completion?.textValue,
          notes: completion?.notes,
          completedAt: completion?.completedAt,
          completedBy: completion?.completedBy,
          hasPhoto: !!completion?.photoKey,
        };
      }),
    }));

    const percentage =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const generatedAt = new Date();
    const referenceId = `PROC-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      ProcedureDocumentPDF({
        organization: {
          name: instance.organization.name,
          tradingName: instance.organization.tradingName,
          nzbn: instance.organization.nzbn,
        },
        template: {
          title: instance.template.title,
          description: instance.template.description,
        },
        instance: {
          startedAt: instance.startedAt,
          completedAt: instance.completedAt,
          createdBy: instance.createdBy,
        },
        sections,
        project: {
          projectNumber: instance.project.projectNumber,
          clientName: instance.project.clientName,
          siteAddress: instance.project.siteAddress,
          startDate: instance.project.startDate,
          completionDate: instance.project.completionDate,
        },
        completionStats: {
          totalItems,
          completedItems,
          percentage,
        },
        generatedAt,
        referenceId,
      })
    );

    const pdfArray = new Uint8Array(pdfBuffer);
    const filename = `procedure-${instance.project.projectNumber}-${Date.now()}.pdf`;

    return new Response(pdfArray, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate procedure document PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate procedure document",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
