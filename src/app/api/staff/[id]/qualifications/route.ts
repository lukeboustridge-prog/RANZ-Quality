import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { z } from "zod/v4";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/types";

const createQualificationSchema = z.object({
  type: z.enum(["NZQA", "MANUFACTURER_CERT", "SAFETY", "FIRST_AID", "SITE_SAFE", "OTHER"]),
  title: z.string().min(1),
  issuingBody: z.string().min(1),
  issueDate: z.string().transform((s) => new Date(s)),
  expiryDate: z
    .string()
    .transform((s) => (s ? new Date(s) : undefined))
    .optional(),
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

    const qualifications = await db.qualification.findMany({
      where: { memberId: id },
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json(qualifications);
  } catch (error) {
    console.error("Failed to fetch qualifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const member = await db.organizationMember.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const formData = await req.formData();

    // Parse text fields
    const rawData: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        rawData[key] = value;
      }
    }

    const data = createQualificationSchema.parse(rawData);
    const file = formData.get("certificate") as File | null;

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Certificate file exceeds maximum size of ${MAX_FILE_SIZE_MB}MB` },
        { status: 413 }
      );
    }

    let certificateKey: string | null = null;

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `qualifications/${id}/${Date.now()}-${file.name}`;
      certificateKey = await uploadToR2(buffer, fileName, file.type);
    }

    const qualification = await db.qualification.create({
      data: {
        memberId: id,
        type: data.type,
        title: data.title,
        issuingBody: data.issuingBody,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        certificateKey,
      },
    });

    return NextResponse.json(qualification, { status: 201 });
  } catch (error) {
    console.error("Failed to create qualification:", error);
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
