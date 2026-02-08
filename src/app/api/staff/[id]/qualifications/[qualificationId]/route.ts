import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { z } from "zod/v4";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/types";

const updateQualificationSchema = z.object({
  type: z.enum(["NZQA", "MANUFACTURER_CERT", "SAFETY", "FIRST_AID", "SITE_SAFE", "OTHER"]).optional(),
  title: z.string().min(1).optional(),
  issuingBody: z.string().min(1).optional(),
  issueDate: z.string().transform((s) => new Date(s)).optional(),
  expiryDate: z
    .string()
    .transform((s) => (s ? new Date(s) : null))
    .optional(),
});

async function getAuthorizedQualification(
  orgId: string,
  memberId: string,
  qualificationId: string
) {
  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (!organization) return null;

  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId: organization.id },
  });

  if (!member) return null;

  const qualification = await db.qualification.findFirst({
    where: { id: qualificationId, memberId },
  });

  if (!qualification) return null;

  return { organization, member, qualification };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; qualificationId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId, qualificationId } = await params;
    const result = await getAuthorizedQualification(orgId, memberId, qualificationId);

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await req.formData();

    // Parse text fields
    const rawData: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        rawData[key] = value;
      }
    }

    const data = updateQualificationSchema.parse(rawData);
    const file = formData.get("certificate") as File | null;

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Certificate file exceeds maximum size of ${MAX_FILE_SIZE_MB}MB` },
        { status: 413 }
      );
    }

    let certificateKey = result.qualification.certificateKey;

    if (file && file.size > 0) {
      // Delete old certificate if exists
      if (result.qualification.certificateKey) {
        await deleteFromR2(result.qualification.certificateKey).catch(() => {});
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `qualifications/${memberId}/${Date.now()}-${file.name}`;
      certificateKey = await uploadToR2(buffer, fileName, file.type);
    }

    const updated = await db.qualification.update({
      where: { id: qualificationId },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.title && { title: data.title }),
        ...(data.issuingBody && { issuingBody: data.issuingBody }),
        ...(data.issueDate && { issueDate: data.issueDate }),
        ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate }),
        certificateKey,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update qualification:", error);
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
  { params }: { params: Promise<{ id: string; qualificationId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId, qualificationId } = await params;
    const result = await getAuthorizedQualification(orgId, memberId, qualificationId);

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete certificate from R2 if exists
    if (result.qualification.certificateKey) {
      await deleteFromR2(result.qualification.certificateKey).catch(() => {});
    }

    await db.qualification.delete({ where: { id: qualificationId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete qualification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
