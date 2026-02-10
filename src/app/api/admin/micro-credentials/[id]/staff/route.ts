import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
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

    // Verify definition exists
    const definition = await db.microCredentialDefinition.findUnique({
      where: { id },
    });

    if (!definition) {
      return NextResponse.json(
        { error: "Credential definition not found" },
        { status: 404 }
      );
    }

    // Fetch all staff credentials for this definition
    const staffCredentials = await db.staffMicroCredential.findMany({
      where: { definitionId: id },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { member: { organization: { name: "asc" } } },
        { member: { lastName: "asc" } },
      ],
    });

    return NextResponse.json(staffCredentials);
  } catch (error) {
    console.error("Failed to fetch staff credentials:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  staffCredentialId: z.string().cuid(),
  status: z
    .enum([
      "NOT_STARTED",
      "IN_TRAINING",
      "ASSESSMENT_PENDING",
      "AWARDED",
      "EXPIRED",
    ])
    .optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).optional(),
});

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
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { staffCredentialId, status, expiryDate, notes } = parsed.data;

    // Fetch existing credential
    const existing = await db.staffMicroCredential.findUnique({
      where: { id: staffCredentialId },
      include: {
        member: {
          include: { organization: true },
        },
        definition: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Staff credential not found" },
        { status: 404 }
      );
    }

    // Verify it belongs to the correct definition
    if (existing.definitionId !== id) {
      return NextResponse.json(
        { error: "Staff credential does not belong to this definition" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      updateData.status = status;

      // If transitioning TO AWARDED, set awardedAt and awardedBy
      if (status === "AWARDED" && existing.status !== "AWARDED") {
        updateData.awardedAt = new Date();
        updateData.awardedBy = userId;
      }
    }

    if (expiryDate !== undefined) {
      updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;

      // Reset expiry alert flags if expiryDate changes
      if (
        expiryDate !== (existing.expiryDate?.toISOString() ?? null)
      ) {
        updateData.expiryAlert90Sent = false;
        updateData.expiryAlert60Sent = false;
        updateData.expiryAlert30Sent = false;
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await db.staffMicroCredential.update({
      where: { id: staffCredentialId },
      data: updateData,
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
            organization: {
              select: { name: true },
            },
          },
        },
        definition: {
          select: { title: true },
        },
      },
    });

    // Determine audit action
    const auditAction =
      status === "AWARDED" && existing.status !== "AWARDED"
        ? "MCRED_AWARD" as const
        : "UPDATE" as const;

    await createAuditLog({
      action: auditAction,
      resourceType: "StaffMicroCredential",
      resourceId: staffCredentialId,
      previousState: {
        status: existing.status,
        expiryDate: existing.expiryDate?.toISOString() || null,
        notes: existing.notes,
      },
      newState: {
        status: updated.status,
        expiryDate: updated.expiryDate?.toISOString() || null,
        notes: updated.notes,
      },
      metadata: {
        staffName: `${existing.member.firstName} ${existing.member.lastName}`,
        credentialTitle: existing.definition.title,
        organizationName: existing.member.organization.name,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update staff credential:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
