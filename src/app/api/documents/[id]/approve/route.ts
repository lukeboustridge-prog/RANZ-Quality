import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  submitForApproval,
  approveVersion,
  rejectVersion,
} from "@/lib/document-versioning";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { revalidatePath } from "next/cache";
import { logDocumentMutation } from "@/lib/audit-log";

// Submit document for approval
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;
    const body = await req.json();
    const { versionId } = body;

    // Verify document belongs to org
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        organization: { clerkOrgId: orgId },
        deletedAt: null,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get the version to submit (latest if not specified)
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const latestVersion = await db.documentVersion.findFirst({
        where: { documentId, status: "DRAFT" },
        orderBy: [{ versionNumber: "desc" }, { minorVersion: "desc" }],
      });

      if (!latestVersion) {
        return NextResponse.json(
          { error: "No draft version to submit" },
          { status: 400 }
        );
      }
      targetVersionId = latestVersion.id;
    }

    await submitForApproval(targetVersionId, userId);

    return NextResponse.json({
      message: "Document submitted for approval",
    });
  } catch (error) {
    console.error("Failed to submit for approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Approve or reject document
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;
    const body = await req.json();
    const { versionId, action, reason } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Verify document belongs to org
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        organization: { clerkOrgId: orgId },
        deletedAt: null,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get the version to approve/reject (latest pending if not specified)
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const pendingVersion = await db.documentVersion.findFirst({
        where: { documentId, status: "PENDING_APPROVAL" },
        orderBy: [{ versionNumber: "desc" }, { minorVersion: "desc" }],
      });

      if (!pendingVersion) {
        return NextResponse.json(
          { error: "No pending version to review" },
          { status: 400 }
        );
      }
      targetVersionId = pendingVersion.id;
    }

    if (action === "approve") {
      await approveVersion(targetVersionId, userId);

      // Log approval to audit trail
      await logDocumentMutation(
        "APPROVE",
        documentId,
        { status: "PENDING_APPROVAL" },
        { status: "APPROVED" },
        { organizationId: document.organizationId, versionId: targetVersionId }
      );

      await updateOrganizationComplianceScore(document.organizationId);
      revalidatePath('/dashboard');
      return NextResponse.json({ message: "Document approved" });
    } else {
      if (!reason) {
        return NextResponse.json(
          { error: "Rejection reason is required" },
          { status: 400 }
        );
      }
      await rejectVersion(targetVersionId, userId, reason);

      // Log rejection to audit trail
      await logDocumentMutation(
        "REJECT",
        documentId,
        { status: "PENDING_APPROVAL" },
        { status: "REJECTED", rejectionReason: reason },
        { organizationId: document.organizationId, versionId: targetVersionId }
      );

      return NextResponse.json({ message: "Document rejected" });
    }
  } catch (error) {
    console.error("Failed to process approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
