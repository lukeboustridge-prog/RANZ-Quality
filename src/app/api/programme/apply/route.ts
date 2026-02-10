import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { createAuditLog } from "@/lib/audit-log";

const applySchema = z.object({
  message: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { orgId, userId, orgRole } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER or ADMIN can apply
    if (orgRole !== "org:admin" && orgRole !== "org:owner") {
      return NextResponse.json(
        { error: "Only organisation owners or admins can apply for programme enrolment" },
        { status: 403 }
      );
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
      include: { programmeEnrolment: true },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organisation not found" },
        { status: 404 }
      );
    }

    // Check for existing enrolment (allow re-application only if WITHDRAWN)
    if (
      organization.programmeEnrolment &&
      organization.programmeEnrolment.status !== "WITHDRAWN"
    ) {
      return NextResponse.json(
        { error: "Your organisation already has an active or pending programme enrolment" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const data = applySchema.parse(body);

    // If WITHDRAWN enrolment exists, delete it first to allow re-application
    if (
      organization.programmeEnrolment &&
      organization.programmeEnrolment.status === "WITHDRAWN"
    ) {
      await db.programmeEnrolment.delete({
        where: { id: organization.programmeEnrolment.id },
      });
    }

    const enrolment = await db.programmeEnrolment.create({
      data: {
        organizationId: organization.id,
        status: "PENDING",
        appliedBy: userId,
        reviewNotes: data.message || null,
      },
    });

    // Log audit event
    await createAuditLog({
      action: "ENROL_APPLY",
      resourceType: "ProgrammeEnrolment",
      resourceId: enrolment.id,
      newState: {
        organizationId: organization.id,
        status: "PENDING",
        appliedBy: userId,
      },
    });

    return NextResponse.json(enrolment, { status: 201 });
  } catch (error) {
    console.error("Failed to apply for programme:", error);
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
