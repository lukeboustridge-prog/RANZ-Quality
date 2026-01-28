import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const createOrganizationSchema = z.object({
  clerkOrgId: z.string().min(1),
  name: z.string().min(1),
  tradingName: z.string().nullable().optional(),
  nzbn: z.string().nullable().optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createOrganizationSchema.parse(body);

    // Check if organization already exists
    const existing = await db.organization.findUnique({
      where: { clerkOrgId: data.clerkOrgId },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    // Create the organization
    const organization = await db.organization.create({
      data: {
        clerkOrgId: data.clerkOrgId,
        name: data.name,
        tradingName: data.tradingName,
        nzbn: data.nzbn,
        email: data.email,
        phone: data.phone,
        certificationTier: "ACCREDITED",
        complianceScore: 0,
      },
    });

    // Create the first member (the owner)
    await db.organizationMember.create({
      data: {
        organizationId: organization.id,
        clerkUserId: userId,
        firstName: "Owner",
        lastName: "",
        email: data.email || "owner@placeholder.local",
        role: "OWNER",
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Failed to create organization:", error);
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

export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
      include: {
        members: true,
        insurancePolicies: true,
        documents: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
