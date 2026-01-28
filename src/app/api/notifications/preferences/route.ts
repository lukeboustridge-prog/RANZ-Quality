import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

// GET - Get user's notification preferences
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let preferences = await db.notificationPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if not exists
    if (!preferences) {
      preferences = await db.notificationPreference.create({
        data: {
          userId,
          emailEnabled: true,
          emailInsurance: true,
          emailAudit: true,
          emailCompliance: true,
          emailNewsletter: true,
          smsEnabled: false,
          smsInsurance: true,
          smsAudit: false,
          smsCritical: true,
        },
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Failed to fetch notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

const updatePreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  emailInsurance: z.boolean().optional(),
  emailAudit: z.boolean().optional(),
  emailCompliance: z.boolean().optional(),
  emailNewsletter: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  smsInsurance: z.boolean().optional(),
  smsAudit: z.boolean().optional(),
  smsCritical: z.boolean().optional(),
  smsPhoneNumber: z.string().optional(),
});

// PATCH - Update notification preferences
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updatePreferencesSchema.parse(body);

    const preferences = await db.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    return NextResponse.json(preferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to update notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
