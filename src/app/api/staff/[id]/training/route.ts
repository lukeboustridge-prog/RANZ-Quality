import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const createTrainingSchema = z.object({
  courseName: z.string().min(1),
  provider: z.string().min(1),
  completedAt: z.string().transform((s) => new Date(s)),
  cpdPoints: z.number().int().min(0).default(0),
  cpdCategory: z.enum(["TECHNICAL", "PEER_REVIEW", "INDUSTRY_EVENT", "SELF_STUDY", "OTHER"]),
  notes: z.string().optional(),
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

    const trainingRecords = await db.trainingRecord.findMany({
      where: { memberId: id },
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json(trainingRecords);
  } catch (error) {
    console.error("Failed to fetch training records:", error);
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
    const body = await req.json();

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

    const data = createTrainingSchema.parse(body);

    const trainingRecord = await db.trainingRecord.create({
      data: {
        memberId: id,
        courseName: data.courseName,
        provider: data.provider,
        completedAt: data.completedAt,
        cpdPoints: data.cpdPoints,
        cpdCategory: data.cpdCategory,
        notes: data.notes,
      },
    });

    return NextResponse.json(trainingRecord, { status: 201 });
  } catch (error) {
    console.error("Failed to create training record:", error);
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
