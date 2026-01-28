import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";

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

    const document = await db.document.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Failed to fetch document:", error);
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

    const document = await db.document.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete file from R2 if exists
    if (document.storageKey) {
      try {
        await deleteFromR2(document.storageKey);
      } catch {
        // Ignore delete errors
      }
    }

    await db.document.delete({ where: { id } });

    // Update compliance score
    await updateComplianceScore(organization.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function updateComplianceScore(organizationId: string) {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      insurancePolicies: true,
      members: true,
      documents: true,
    },
  });

  if (!organization) return;

  const now = new Date();
  let score = 0;

  // Insurance score (40%)
  const validPolicies = organization.insurancePolicies.filter(
    (p) => new Date(p.expiryDate) > now
  );
  const hasPL = validPolicies.some((p) => p.policyType === "PUBLIC_LIABILITY");
  const hasPI = validPolicies.some(
    (p) => p.policyType === "PROFESSIONAL_INDEMNITY"
  );
  if (hasPL) score += 20;
  if (hasPI) score += 20;

  // Personnel score (30%)
  const hasOwner = organization.members.some((m) => m.role === "OWNER");
  const hasLBP = organization.members.some((m) => m.lbpNumber);
  if (hasOwner) score += 15;
  if (hasLBP) score += 15;

  // Documentation score (30%)
  const hasQP = organization.documents.some(
    (d) => d.isoElement === "QUALITY_POLICY"
  );
  const hasQO = organization.documents.some(
    (d) => d.isoElement === "QUALITY_OBJECTIVES"
  );
  if (hasQP) score += 15;
  if (hasQO) score += 15;

  await db.organization.update({
    where: { id: organizationId },
    data: { complianceScore: score },
  });
}
