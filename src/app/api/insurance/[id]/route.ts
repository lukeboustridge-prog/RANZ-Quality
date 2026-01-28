import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { deleteFromR2, uploadToR2 } from "@/lib/r2";
import { z } from "zod/v4";
import { logInsuranceMutation } from "@/lib/audit-log";

const updatePolicySchema = z.object({
  policyType: z.enum([
    "PUBLIC_LIABILITY",
    "PROFESSIONAL_INDEMNITY",
    "STATUTORY_LIABILITY",
    "EMPLOYERS_LIABILITY",
    "MOTOR_VEHICLE",
    "CONTRACT_WORKS",
  ]),
  policyNumber: z.string().min(1),
  insurer: z.string().min(1),
  brokerName: z.string().optional(),
  coverageAmount: z.string().min(1),
  excessAmount: z.string().optional(),
  effectiveDate: z.string().min(1),
  expiryDate: z.string().min(1),
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

    const policy = await db.insurancePolicy.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Failed to fetch policy:", error);
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

    const existingPolicy = await db.insurancePolicy.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingPolicy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const data = {
      policyType: formData.get("policyType") as string,
      policyNumber: formData.get("policyNumber") as string,
      insurer: formData.get("insurer") as string,
      brokerName: formData.get("brokerName") as string | undefined,
      coverageAmount: formData.get("coverageAmount") as string,
      excessAmount: formData.get("excessAmount") as string | undefined,
      effectiveDate: formData.get("effectiveDate") as string,
      expiryDate: formData.get("expiryDate") as string,
    };

    const validatedData = updatePolicySchema.parse(data);
    const file = formData.get("certificate") as File | null;

    let certificateKey = existingPolicy.certificateKey;

    if (file && file.size > 0) {
      // Delete old file if exists
      if (existingPolicy.certificateKey) {
        try {
          await deleteFromR2(existingPolicy.certificateKey);
        } catch {
          // Ignore delete errors
        }
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `insurance/${organization.id}/${Date.now()}-${file.name}`;
      certificateKey = await uploadToR2(buffer, fileName, file.type);
    }

    const policy = await db.insurancePolicy.update({
      where: { id },
      data: {
        policyType: validatedData.policyType,
        policyNumber: validatedData.policyNumber,
        insurer: validatedData.insurer,
        brokerName: validatedData.brokerName || null,
        coverageAmount: parseFloat(validatedData.coverageAmount),
        excessAmount: validatedData.excessAmount
          ? parseFloat(validatedData.excessAmount)
          : null,
        effectiveDate: new Date(validatedData.effectiveDate),
        expiryDate: new Date(validatedData.expiryDate),
        certificateKey,
      },
    });

    // Log update to audit trail with before/after state
    await logInsuranceMutation(
      "UPDATE",
      id,
      {
        policyType: existingPolicy.policyType,
        policyNumber: existingPolicy.policyNumber,
        insurer: existingPolicy.insurer,
        coverageAmount: existingPolicy.coverageAmount.toString(),
        expiryDate: existingPolicy.expiryDate.toISOString(),
      },
      {
        policyType: policy.policyType,
        policyNumber: policy.policyNumber,
        insurer: policy.insurer,
        coverageAmount: policy.coverageAmount.toString(),
        expiryDate: policy.expiryDate.toISOString(),
      },
      { organizationId: organization.id }
    );

    // Update compliance score
    await updateComplianceScore(organization.id);

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Failed to update policy:", error);
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

    const policy = await db.insurancePolicy.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // Delete file from R2 if exists
    if (policy.certificateKey) {
      try {
        await deleteFromR2(policy.certificateKey);
      } catch {
        // Ignore delete errors
      }
    }

    await db.insurancePolicy.delete({ where: { id } });

    // Log deletion to audit trail
    await logInsuranceMutation(
      "DELETE",
      id,
      {
        policyType: policy.policyType,
        policyNumber: policy.policyNumber,
        insurer: policy.insurer,
        coverageAmount: policy.coverageAmount.toString(),
        expiryDate: policy.expiryDate.toISOString(),
      },
      null, // No new state after deletion
      { organizationId: organization.id }
    );

    // Update compliance score
    await updateComplianceScore(organization.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete policy:", error);
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
