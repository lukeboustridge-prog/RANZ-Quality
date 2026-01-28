import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { logInsuranceMutation } from "@/lib/audit-log";

const createPolicySchema = z.object({
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

    const policies = await db.insurancePolicy.findMany({
      where: { organizationId: organization.id },
      orderBy: { expiryDate: "asc" },
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Failed to fetch policies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const validatedData = createPolicySchema.parse(data);
    const file = formData.get("certificate") as File | null;

    let certificateKey: string | null = null;

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `insurance/${organization.id}/${Date.now()}-${file.name}`;
      certificateKey = await uploadToR2(buffer, fileName, file.type);
    }

    const policy = await db.insurancePolicy.create({
      data: {
        organizationId: organization.id,
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

    // Log creation to audit trail
    await logInsuranceMutation(
      "CREATE",
      policy.id,
      null, // No previous state for CREATE
      {
        policyType: policy.policyType,
        policyNumber: policy.policyNumber,
        insurer: policy.insurer,
        coverageAmount: policy.coverageAmount.toString(),
        effectiveDate: policy.effectiveDate.toISOString(),
        expiryDate: policy.expiryDate.toISOString(),
      },
      {
        organizationId: organization.id,
        certificateUploaded: !!certificateKey,
      }
    );

    // Update compliance score
    await updateOrganizationComplianceScore(organization.id);
    revalidatePath('/dashboard');

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Failed to create policy:", error);
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

