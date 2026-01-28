import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";

const updateCAPASchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "PENDING_VERIFICATION", "CLOSED", "OVERDUE"])
    .optional(),
  rootCause: z.string().optional(),
  correctiveAction: z.string().optional(),
  preventiveAction: z.string().optional(),
  assignedTo: z.string().optional(),
  assignedToName: z.string().optional(),
  dueDate: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  evidenceKeys: z.array(z.string()).optional(),
});

const verifyCAPASchema = z.object({
  verificationNotes: z.string().min(1),
  approved: z.boolean(),
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

    const { id: capaId } = await params;

    const capa = await db.cAPARecord.findFirst({
      where: {
        id: capaId,
        organization: { clerkOrgId: orgId },
      },
      include: {
        audit: {
          select: { auditNumber: true, auditType: true, scheduledDate: true },
        },
        organization: {
          select: { name: true },
        },
      },
    });

    if (!capa) {
      return NextResponse.json({ error: "CAPA not found" }, { status: 404 });
    }

    return NextResponse.json(capa);
  } catch (error) {
    console.error("Failed to fetch CAPA:", error);
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

    const { id: capaId } = await params;

    const capa = await db.cAPARecord.findFirst({
      where: {
        id: capaId,
        organization: { clerkOrgId: orgId },
      },
    });

    if (!capa) {
      return NextResponse.json({ error: "CAPA not found" }, { status: 404 });
    }

    if (capa.status === "CLOSED") {
      return NextResponse.json(
        { error: "Cannot modify closed CAPA" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = updateCAPASchema.parse(body);

    const updatedCAPA = await db.cAPARecord.update({
      where: { id: capaId },
      data: {
        ...data,
        evidenceKeys: data.evidenceKeys || capa.evidenceKeys,
      },
    });

    return NextResponse.json(updatedCAPA);
  } catch (error) {
    console.error("Failed to update CAPA:", error);
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

// Verify and close CAPA
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: capaId } = await params;

    const capa = await db.cAPARecord.findFirst({
      where: {
        id: capaId,
        organization: { clerkOrgId: orgId },
      },
    });

    if (!capa) {
      return NextResponse.json({ error: "CAPA not found" }, { status: 404 });
    }

    if (capa.status === "CLOSED") {
      return NextResponse.json(
        { error: "CAPA already closed" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = verifyCAPASchema.parse(body);

    if (data.approved) {
      const updatedCAPA = await db.cAPARecord.update({
        where: { id: capaId },
        data: {
          status: "CLOSED",
          verifiedBy: userId,
          verifiedAt: new Date(),
          verificationNotes: data.verificationNotes,
          closedDate: new Date(),
        },
      });

      // Update compliance score
      await updateOrganizationComplianceScore(capa.organizationId);

      return NextResponse.json(updatedCAPA);
    } else {
      // Reject verification - send back to IN_PROGRESS
      const updatedCAPA = await db.cAPARecord.update({
        where: { id: capaId },
        data: {
          status: "IN_PROGRESS",
          verificationNotes: `Verification rejected: ${data.verificationNotes}`,
        },
      });

      return NextResponse.json(updatedCAPA);
    }
  } catch (error) {
    console.error("Failed to verify CAPA:", error);
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: capaId } = await params;

    const capa = await db.cAPARecord.findFirst({
      where: {
        id: capaId,
        organization: { clerkOrgId: orgId },
      },
    });

    if (!capa) {
      return NextResponse.json({ error: "CAPA not found" }, { status: 404 });
    }

    // Only allow deletion of open CAPAs without audit link
    if (capa.auditId) {
      return NextResponse.json(
        { error: "Cannot delete CAPA linked to an audit" },
        { status: 400 }
      );
    }

    if (capa.status !== "OPEN") {
      return NextResponse.json(
        { error: "Only open CAPAs can be deleted" },
        { status: 400 }
      );
    }

    await db.cAPARecord.delete({ where: { id: capaId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete CAPA:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
