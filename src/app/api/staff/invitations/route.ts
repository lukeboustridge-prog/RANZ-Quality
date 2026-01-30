import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const deleteInvitationSchema = z.object({
  invitationId: z.string(),
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

    const member = organization.members[0];
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      return NextResponse.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    // Initialize Clerk client
    const client = await clerkClient();

    // Get pending invitations
    const { data, totalCount } = await client.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ['pending'],
      limit: 50,
    });

    // Map Clerk invitations to response format
    const invitations = data.map((inv) => {
      // Map Clerk role back to database role format
      const role = inv.role === "org:admin" ? "ADMIN" : "STAFF";

      return {
        id: inv.id,
        emailAddress: inv.emailAddress,
        role,
        createdAt: inv.createdAt,
        status: inv.status,
      };
    });

    return NextResponse.json({
      invitations,
      total: totalCount,
    });
  } catch (error) {
    console.error("Failed to fetch invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
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

    const member = organization.members[0];
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      return NextResponse.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = deleteInvitationSchema.parse(body);

    // Initialize Clerk client
    const client = await clerkClient();

    // Revoke invitation
    const revokedInvitation = await client.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId: data.invitationId,
      requestingUserId: userId,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: revokedInvitation.id,
        status: revokedInvitation.status,
      },
    });
  } catch (error) {
    console.error("Failed to revoke invitation:", error);
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
