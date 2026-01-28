import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { verifyAndUpdateMember } from "@/lib/lbp-api";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { revalidatePath } from "next/cache";

const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["OWNER", "ADMIN", "STAFF"]),
  lbpNumber: z.string().optional(),
  lbpClass: z
    .enum([
      "CARPENTRY",
      "ROOFING",
      "DESIGN_1",
      "DESIGN_2",
      "DESIGN_3",
      "SITE_1",
      "SITE_2",
      "SITE_3",
    ])
    .optional(),
});

export async function GET() {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const members = await db.organizationMember.findMany({
      where: { organizationId: organization.id },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data = createMemberSchema.parse(body);

    // Check if email already exists in this organization
    const existingMember = await db.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        email: data.email,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "A member with this email already exists" },
        { status: 400 }
      );
    }

    // Create the member
    const member = await db.organizationMember.create({
      data: {
        organizationId: organization.id,
        clerkUserId: `manual_${Date.now()}`, // Placeholder for manually added members
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        lbpNumber: data.lbpNumber || null,
        lbpClass: data.lbpClass || null,
        lbpVerified: false,
      },
    });

    // If LBP number provided, trigger verification
    if (data.lbpNumber) {
      try {
        await verifyAndUpdateMember(member.id);
      } catch (verifyError) {
        console.error("LBP verification failed:", verifyError);
        // Continue even if verification fails - it can be retried later
      }
    }

    // Update compliance score
    await updateOrganizationComplianceScore(organization.id);
    revalidatePath('/dashboard');

    // Get updated member with verification status
    const updatedMember = await db.organizationMember.findUnique({
      where: { id: member.id },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Failed to create member:", error);
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
