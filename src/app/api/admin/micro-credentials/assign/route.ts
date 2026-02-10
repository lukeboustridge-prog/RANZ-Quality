import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

/**
 * GET /api/admin/micro-credentials/assign
 *
 * Returns organizations with their members for the assignment form.
 * Query params:
 *   - orgId: (optional) return members for a specific org only
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (orgId) {
      // Return members for a specific org
      const members = await db.organizationMember.findMany({
        where: { organization: { id: orgId } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
      return NextResponse.json({ members });
    }

    // Return all organizations for the dropdown
    const organizations = await db.organization.findMany({
      select: {
        id: true,
        name: true,
        tradingName: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Failed to fetch assignment data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const assignSchema = z.object({
  definitionId: z.string().cuid(),
  memberId: z.string().cuid(),
  status: z
    .enum([
      "NOT_STARTED",
      "IN_TRAINING",
      "ASSESSMENT_PENDING",
      "AWARDED",
      "EXPIRED",
    ])
    .default("NOT_STARTED"),
  expiryDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { definitionId, memberId, status, expiryDate, notes } = parsed.data;

    // Validate definition exists
    const definition = await db.microCredentialDefinition.findUnique({
      where: { id: definitionId },
    });

    if (!definition) {
      return NextResponse.json(
        { error: "Credential definition not found" },
        { status: 404 }
      );
    }

    // Validate member exists, include organization for audit context
    const member = await db.organizationMember.findUnique({
      where: { id: memberId },
      include: { organization: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Check for existing assignment
    const existing = await db.staffMicroCredential.findUnique({
      where: {
        definitionId_memberId: {
          definitionId,
          memberId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `${member.firstName} ${member.lastName} already has this credential assigned.`,
        },
        { status: 409 }
      );
    }

    // Build create data
    const createData: {
      definitionId: string;
      memberId: string;
      status: "NOT_STARTED" | "IN_TRAINING" | "ASSESSMENT_PENDING" | "AWARDED" | "EXPIRED";
      notes?: string;
      expiryDate?: Date;
      awardedAt?: Date;
      awardedBy?: string;
    } = {
      definitionId,
      memberId,
      status,
      notes: notes || undefined,
    };

    if (expiryDate) {
      createData.expiryDate = new Date(expiryDate);
    }

    // If status is AWARDED, set awardedAt and awardedBy
    if (status === "AWARDED") {
      createData.awardedAt = new Date();
      createData.awardedBy = userId;
    }

    const credential = await db.staffMicroCredential.create({
      data: createData,
      include: {
        definition: true,
        member: {
          include: { organization: true },
        },
      },
    });

    await createAuditLog({
      action: "MCRED_ASSIGN",
      resourceType: "StaffMicroCredential",
      resourceId: credential.id,
      newState: {
        definitionId,
        memberId,
        status,
        expiryDate: expiryDate || null,
      },
      metadata: {
        staffName: `${member.firstName} ${member.lastName}`,
        credentialTitle: definition.title,
        organizationName: member.organization.name,
        organizationId: member.organizationId,
      },
    });

    return NextResponse.json(credential, { status: 201 });
  } catch (error) {
    console.error("Failed to assign micro-credential:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
