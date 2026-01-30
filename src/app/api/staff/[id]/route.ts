import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { logMemberMutation } from "@/lib/audit-log";

const updateMemberSchema = z.object({
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
    .optional()
    .nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const member = await db.organizationMember.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error("Failed to fetch member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Check if this is a role-only update (from staff-list) or full update (from user form)
    const isRoleUpdate = body.role && Object.keys(body).length === 1;

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

    const existingMember = await db.organizationMember.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (isRoleUpdate) {
      // Role-only update from staff-list
      const roleSchema = z.object({ role: z.enum(["ADMIN", "STAFF"]) });
      const { role } = roleSchema.parse(body);

      // Validation: Cannot change OWNER's role
      if (existingMember.role === "OWNER") {
        return NextResponse.json(
          { error: "Cannot change owner role" },
          { status: 403 }
        );
      }

      // Validation: Cannot change own role
      if (existingMember.clerkUserId === userId) {
        return NextResponse.json(
          { error: "Cannot change your own role" },
          { status: 400 }
        );
      }

      // Update role only
      const member = await db.organizationMember.update({
        where: { id },
        data: { role },
      });

      revalidatePath("/settings");
      return NextResponse.json(member);
    } else {
      // Full member update (existing logic)
      const data = updateMemberSchema.parse(body);

      // Check if email already exists for another member
      const emailConflict = await db.organizationMember.findFirst({
        where: {
          organizationId: organization.id,
          email: data.email,
          NOT: { id },
        },
      });

      if (emailConflict) {
        return NextResponse.json(
          { error: "Another member with this email already exists" },
          { status: 400 }
        );
      }

      const member = await db.organizationMember.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          role: data.role,
          lbpNumber: data.lbpNumber || null,
          lbpClass: data.lbpClass || null,
        },
      });

      // Log update to audit trail
      await logMemberMutation(
        "UPDATE",
        id,
        {
          firstName: existingMember.firstName,
          lastName: existingMember.lastName,
          email: existingMember.email,
          role: existingMember.role,
          lbpNumber: existingMember.lbpNumber,
        },
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

      return NextResponse.json(member);
    }
  } catch (error) {
    console.error("Failed to update member:", error);
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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

    const member = await db.organizationMember.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Validation: Cannot remove OWNER
    if (member.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove organization owner" },
        { status: 403 }
      );
    }

    // Validation: Cannot remove self
    if (member.clerkUserId === userId) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 400 }
      );
    }

    await db.organizationMember.delete({ where: { id } });

    // Log deletion to audit trail
    await logMemberMutation(
      "DELETE",
      id,
      {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role,
      },
      null,
      { organizationId: organization.id }
    );

    // Update compliance score
    await updateOrganizationComplianceScore(organization.id);
    revalidatePath('/dashboard');
    revalidatePath('/settings');

    return NextResponse.json({
      success: true,
      message: "Member removed"
    });
  } catch (error) {
    console.error("Failed to delete member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

