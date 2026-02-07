import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const createSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  categories: z.array(z.string()).default([]),
  apexCertified: z.boolean().default(false),
  apexCertId: z.string().optional(),
  status: z
    .enum(["APPROVED", "CONDITIONAL", "SUSPENDED", "REMOVED"])
    .default("APPROVED"),
  rating: z.number().int().min(1).max(5).optional(),
  evaluationDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
  evaluationNotes: z.string().optional(),
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

    const suppliers = await db.approvedSupplier.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
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

    const body = await req.json();
    const validatedData = createSupplierSchema.parse(body);

    const supplier = await db.approvedSupplier.create({
      data: {
        organizationId: organization.id,
        name: validatedData.name,
        contactPerson: validatedData.contactPerson || null,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        categories: validatedData.categories,
        apexCertified: validatedData.apexCertified,
        apexCertId: validatedData.apexCertId || null,
        status: validatedData.status,
        rating: validatedData.rating ?? null,
        evaluationDate: validatedData.evaluationDate
          ? new Date(validatedData.evaluationDate)
          : null,
        nextReviewDate: validatedData.nextReviewDate
          ? new Date(validatedData.nextReviewDate)
          : null,
        evaluationNotes: validatedData.evaluationNotes || null,
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Failed to create supplier:", error);
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
