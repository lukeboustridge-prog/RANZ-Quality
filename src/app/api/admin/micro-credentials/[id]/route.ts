import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  level: z.number().int().min(1).max(10).optional(),
  skillStandard: z.string().max(200).optional().nullable(),
  issuingBody: z.string().min(1).max(200).optional(),
  requirements: z.string().max(2000).optional().nullable(),
});

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

    const definition = await db.microCredentialDefinition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { staffCredentials: true },
        },
        staffCredentials: {
          select: { status: true },
        },
      },
    });

    if (!definition) {
      return NextResponse.json(
        { error: "Definition not found" },
        { status: 404 }
      );
    }

    // Group staff credentials by status for summary
    const statusCounts = definition.staffCredentials.reduce(
      (acc, cred) => {
        acc[cred.status] = (acc[cred.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const { staffCredentials: _, ...rest } = definition;

    return NextResponse.json({ ...rest, statusCounts });
  } catch (error) {
    console.error("Failed to fetch micro-credential definition:", error);
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

    const existing = await db.microCredentialDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Definition not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Do not allow changing isDefault
    const updated = await db.microCredentialDefinition.update({
      where: { id },
      data: parsed.data,
    });

    await createAuditLog({
      action: "UPDATE",
      resourceType: "MicroCredentialDefinition",
      resourceId: id,
      previousState: {
        title: existing.title,
        level: existing.level,
        issuingBody: existing.issuingBody,
        skillStandard: existing.skillStandard,
      },
      newState: {
        title: updated.title,
        level: updated.level,
        issuingBody: updated.issuingBody,
        skillStandard: updated.skillStandard,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update micro-credential definition:", error);
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

    const existing = await db.microCredentialDefinition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { staffCredentials: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Definition not found" },
        { status: 404 }
      );
    }

    if (existing.isDefault) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a default credential definition. Default definitions are core RANZ credentials.",
        },
        { status: 409 }
      );
    }

    if (existing._count.staffCredentials > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete this definition because it has ${existing._count.staffCredentials} staff credential assignment(s). Remove all assignments first.`,
        },
        { status: 409 }
      );
    }

    await db.microCredentialDefinition.delete({
      where: { id },
    });

    await createAuditLog({
      action: "DELETE",
      resourceType: "MicroCredentialDefinition",
      resourceId: id,
      previousState: {
        title: existing.title,
        level: existing.level,
        issuingBody: existing.issuingBody,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete micro-credential definition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
