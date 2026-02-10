import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { createAuditLog } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "suspend", "reinstate"]),
  notes: z.string().max(500).optional(),
  reason: z.string().max(500).optional(),
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

    // Only ranz:admin can modify (not auditors)
    const metadata = sessionClaims?.metadata as { role?: string } | undefined;
    const userRole = metadata?.role;
    if (userRole !== "ranz:admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const enrolment = await db.programmeEnrolment.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!enrolment) {
      return NextResponse.json(
        { error: "Enrolment not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data = actionSchema.parse(body);

    const now = new Date();
    let updatedEnrolment;
    let auditAction: "ENROL_APPROVE" | "ENROL_REJECT" | "ENROL_SUSPEND" | "ENROL_REINSTATE";
    let notificationMessage: string;

    switch (data.action) {
      case "approve": {
        if (enrolment.status !== "PENDING") {
          return NextResponse.json(
            { error: "Only PENDING enrolments can be approved" },
            { status: 400 }
          );
        }

        const anniversaryDate = new Date(now);
        anniversaryDate.setFullYear(anniversaryDate.getFullYear() + 1);

        updatedEnrolment = await db.programmeEnrolment.update({
          where: { id },
          data: {
            status: "ACTIVE",
            activeSince: now,
            anniversaryDate,
            reviewedAt: now,
            reviewedBy: userId,
            reviewNotes: data.notes || null,
          },
        });

        auditAction = "ENROL_APPROVE";
        notificationMessage = `Your RoofWright programme application has been approved. Welcome to the programme! Your anniversary date is ${anniversaryDate.toLocaleDateString("en-NZ")}.`;
        break;
      }

      case "reject": {
        if (enrolment.status !== "PENDING") {
          return NextResponse.json(
            { error: "Only PENDING enrolments can be rejected" },
            { status: 400 }
          );
        }

        updatedEnrolment = await db.programmeEnrolment.update({
          where: { id },
          data: {
            status: "WITHDRAWN",
            reviewedAt: now,
            reviewedBy: userId,
            reviewNotes: data.notes || null,
          },
        });

        auditAction = "ENROL_REJECT";
        notificationMessage = "Your RoofWright programme application has been declined. Please contact RANZ for more information.";
        break;
      }

      case "suspend": {
        if (enrolment.status !== "ACTIVE" && enrolment.status !== "RENEWAL_DUE") {
          return NextResponse.json(
            { error: "Only ACTIVE or RENEWAL_DUE enrolments can be suspended" },
            { status: 400 }
          );
        }

        updatedEnrolment = await db.programmeEnrolment.update({
          where: { id },
          data: {
            status: "SUSPENDED",
            suspendedAt: now,
            suspendedBy: userId,
            suspendedReason: data.reason || null,
          },
        });

        auditAction = "ENROL_SUSPEND";
        notificationMessage = `Your RoofWright programme enrolment has been suspended.${data.reason ? ` Reason: ${data.reason}` : ""} Please contact RANZ for more information.`;
        break;
      }

      case "reinstate": {
        if (enrolment.status !== "SUSPENDED") {
          return NextResponse.json(
            { error: "Only SUSPENDED enrolments can be reinstated" },
            { status: 400 }
          );
        }

        updatedEnrolment = await db.programmeEnrolment.update({
          where: { id },
          data: {
            status: "ACTIVE",
            suspendedAt: null,
            suspendedBy: null,
            suspendedReason: null,
          },
        });

        auditAction = "ENROL_REINSTATE";
        notificationMessage = "Your RoofWright programme enrolment has been reinstated. You are now active in the programme again.";
        break;
      }
    }

    // Log audit event
    await createAuditLog({
      action: auditAction,
      resourceType: "ProgrammeEnrolment",
      resourceId: enrolment.id,
      previousState: {
        status: enrolment.status,
        organizationId: enrolment.organizationId,
      },
      newState: {
        status: updatedEnrolment.status,
        action: data.action,
      },
      metadata: {
        organizationName: enrolment.organization.name,
        notes: data.notes || data.reason || null,
      },
    });

    // Send notification to org
    await createNotification({
      organizationId: enrolment.organizationId,
      type: "PROGRAMME_STATUS_CHANGE",
      channel: "EMAIL",
      title: "RoofWright Programme Status Update",
      message: notificationMessage,
      actionUrl: "/programme",
      recipient: enrolment.organization.email || undefined,
    });

    return NextResponse.json(updatedEnrolment);
  } catch (error) {
    console.error("Failed to update programme enrolment:", error);
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
