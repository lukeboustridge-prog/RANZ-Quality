import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const updateSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  categories: z.array(z.string()).default([]),
  apexCertified: z.boolean().default(false),
  apexCertId: z.string().optional(),
  status: z.enum(["APPROVED", "CONDITIONAL", "SUSPENDED", "REMOVED"]),
  rating: z.number().int().min(1).max(5).optional(),
  evaluationDate: z.string().optional(),
  nextReviewDate: z.string().optional(),
  evaluationNotes: z.string().optional(),
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

    const supplier = await db.approvedSupplier.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Failed to fetch supplier:", error);
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

    const existingSupplier = await db.approvedSupplier.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = updateSupplierSchema.parse(body);

    const supplier = await db.approvedSupplier.update({
      where: { id },
      data: {
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
    console.error("Failed to update supplier:", error);
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

    const supplier = await db.approvedSupplier.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    await db.approvedSupplier.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete supplier:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
