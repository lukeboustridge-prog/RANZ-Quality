import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const inviteSchema = z.object({
  emailAddress: z.string().email(),
  role: z.enum(["ADMIN", "STAFF"]),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find organization and verify member role
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

    const member = organization.members[0];
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      return NextResponse.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = inviteSchema.parse(body);

    // Check if email already exists in organization
    const existingMember = await db.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        email: data.emailAddress,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "A member with this email already exists" },
        { status: 400 }
      );
    }

    // Map database role to Clerk role format
    const clerkRole = data.role === "ADMIN" ? "org:admin" : "org:member";

    // Initialize Clerk client (v6 is async)
    const client = await clerkClient();

    // Create invitation via Clerk
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: data.emailAddress,
      role: clerkRole,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
      publicMetadata: {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        emailAddress: invitation.emailAddress,
        role: data.role,
        status: invitation.status,
        createdAt: invitation.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to create invitation:", error);
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
