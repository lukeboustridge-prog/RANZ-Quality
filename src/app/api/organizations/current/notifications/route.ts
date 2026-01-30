import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

// GET - Get organization notification preferences
export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization
    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
      include: {
        members: {
          where: { clerkUserId: userId },
          select: { role: true },
        },
        notificationPreference: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check admin access
    const member = organization.members[0];
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden - admin access required" }, { status: 403 });
    }

    // Create default preferences if not exists
    let preferences = organization.notificationPreference;
    if (!preferences) {
      preferences = await db.organizationNotificationPreference.create({
        data: {
          organizationId: organization.id,
          emailEnabled: true,
          emailInsuranceAlerts: true,
          emailAuditAlerts: true,
          emailComplianceAlerts: true,
          emailSystemAlerts: true,
          smsEnabled: false,
          smsInsuranceAlerts: true,
          smsAuditAlerts: false,
          smsCriticalAlerts: true,
        },
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Failed to fetch notification preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updatePreferencesSchema = z.object({
  // Email preferences
  emailEnabled: z.boolean().optional(),
  emailInsuranceAlerts: z.boolean().optional(),
  emailAuditAlerts: z.boolean().optional(),
  emailComplianceAlerts: z.boolean().optional(),
  emailSystemAlerts: z.boolean().optional(),

  // SMS preferences
  smsEnabled: z.boolean().optional(),
  smsInsuranceAlerts: z.boolean().optional(),
  smsAuditAlerts: z.boolean().optional(),
  smsCriticalAlerts: z.boolean().optional(),

  // Override contacts
  notificationEmail: z.string().email().nullable().optional(),
  notificationPhone: z.string().max(20).nullable().optional(),
});

// PATCH - Update organization notification preferences (OWNER/ADMIN only)
export async function PATCH(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization and verify membership + role
    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
      include: {
        members: {
          where: { clerkUserId: userId },
          select: { role: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const member = organization.members[0];
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden - admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const data = updatePreferencesSchema.parse(body);

    // Upsert preferences
    const preferences = await db.organizationNotificationPreference.upsert({
      where: { organizationId: organization.id },
      update: data,
      create: {
        organizationId: organization.id,
        ...data,
      },
    });

    return NextResponse.json(preferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to update notification preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
