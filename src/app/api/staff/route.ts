import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { verifyAndUpdateMember } from "@/lib/lbp-api";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { revalidatePath } from "next/cache";
import { logMemberMutation } from "@/lib/audit-log";

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
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find organization and verify admin role
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
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const currentMember = organization.members[0];
    if (!currentMember || !["OWNER", "ADMIN"].includes(currentMember.role)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Query all members with sorting
    const allMembers = await db.organizationMember.findMany({
      where: { organizationId: organization.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        lbpNumber: true,
        lbpVerified: true,
        clerkUserId: true,
        createdAt: true,
      },
      orderBy: [
        { role: "asc" },
        { firstName: "asc" },
      ],
    });

    // Sort OWNER first manually
    const sortedMembers = [...allMembers].sort((a, b) => {
      const roleOrder = { OWNER: 0, ADMIN: 1, STAFF: 2 };
      const roleComparison = roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
      if (roleComparison !== 0) return roleComparison;
      return a.firstName.localeCompare(b.firstName);
    });

    return NextResponse.json({
      members: sortedMembers,
      currentUserId: userId,
    });
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

    // Log creation to audit trail
    await logMemberMutation(
      "CREATE",
      member.id,
      null,
      {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role,
        lbpNumber: member.lbpNumber,
      },
      { organizationId: organization.id }
    );

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
