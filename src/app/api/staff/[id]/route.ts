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

    const existingMember = await db.organizationMember.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await req.json();
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

    // Prevent deleting the owner
    if (member.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove the organization owner" },
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

