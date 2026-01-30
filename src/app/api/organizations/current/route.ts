import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

// GET - Get current organization profile
export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        id: true,
        name: true,
        tradingName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        description: true,
        logoKey: true,
        nzbn: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updateOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  tradingName: z.string().max(100).nullable().optional(),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  city: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

// PATCH - Update organization profile (OWNER/ADMIN only)
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
    const data = updateOrgSchema.parse(body);

    const updated = await db.organization.update({
      where: { id: organization.id },
      data,
      select: {
        id: true,
        name: true,
        tradingName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        description: true,
        logoKey: true,
        nzbn: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to update organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
