import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { z } from "zod/v4";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/types";

const updateTrainingSchema = z.object({
  courseName: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  completedAt: z.string().transform((s) => new Date(s)).optional(),
  cpdPoints: z
    .string()
    .transform((s) => parseInt(s, 10))
    .optional(),
  cpdCategory: z.enum(["TECHNICAL", "PEER_REVIEW", "INDUSTRY_EVENT", "SELF_STUDY", "OTHER"]).optional(),
  notes: z.string().optional(),
});

async function getAuthorizedTrainingRecord(
  orgId: string,
  memberId: string,
  trainingId: string
) {
  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (!organization) return null;

  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId: organization.id },
  });

  if (!member) return null;

  const record = await db.trainingRecord.findFirst({
    where: { id: trainingId, memberId },
  });

  if (!record) return null;

  return { organization, member, record };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; trainingId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId, trainingId } = await params;
    const result = await getAuthorizedTrainingRecord(orgId, memberId, trainingId);

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

    const data = updateTrainingSchema.parse(rawData);
    const file = formData.get("certificate") as File | null;

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Certificate file exceeds maximum size of ${MAX_FILE_SIZE_MB}MB` },
        { status: 413 }
      );
    }

    let certificateKey = result.record.certificateKey;

    if (file && file.size > 0) {
      if (result.record.certificateKey) {
        await deleteFromR2(result.record.certificateKey).catch(() => {});
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `training/${memberId}/${Date.now()}-${file.name}`;
      certificateKey = await uploadToR2(buffer, fileName, file.type);
    }

    const updated = await db.trainingRecord.update({
      where: { id: trainingId },
      data: {
        ...(data.courseName && { courseName: data.courseName }),
        ...(data.provider && { provider: data.provider }),
        ...(data.completedAt && { completedAt: data.completedAt }),
        ...(data.cpdPoints !== undefined && { cpdPoints: data.cpdPoints }),
        ...(data.cpdCategory && { cpdCategory: data.cpdCategory }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        certificateKey,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update training record:", error);
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
  { params }: { params: Promise<{ id: string; trainingId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId, trainingId } = await params;
    const result = await getAuthorizedTrainingRecord(orgId, memberId, trainingId);

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (result.record.certificateKey) {
      await deleteFromR2(result.record.certificateKey).catch(() => {});
    }

    await db.trainingRecord.delete({ where: { id: trainingId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete training record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
