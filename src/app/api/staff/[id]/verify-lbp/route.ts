import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { verifyAndUpdateMember } from "@/lib/lbp-api";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { revalidatePath } from "next/cache";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;

    // Verify member belongs to organization
    const member = await db.organizationMember.findFirst({
      where: {
        id: memberId,
        organization: { clerkOrgId: orgId },
      },
      include: { organization: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!member.lbpNumber) {
      return NextResponse.json(
        { error: "Member does not have an LBP number" },
        { status: 400 }
      );
    }

    // Perform verification
    const result = await verifyAndUpdateMember(memberId);

    if (!result) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 500 }
      );
    }

    // Update organization compliance score
    await updateOrganizationComplianceScore(member.organizationId);
    revalidatePath('/dashboard');

    // Get updated member
    const updatedMember = await db.organizationMember.findUnique({
      where: { id: memberId },
    });

    return NextResponse.json({
      success: true,
      verification: result,
      member: updatedMember,
    });
  } catch (error) {
    console.error("Failed to verify LBP:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
