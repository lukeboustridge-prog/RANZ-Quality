import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const isoElements = [
  "QUALITY_POLICY",
  "QUALITY_OBJECTIVES",
  "ORG_STRUCTURE",
  "PROCESS_MANAGEMENT",
  "DOCUMENTATION",
  "TRAINING_COMPETENCE",
  "CONTRACT_REVIEW",
  "DOCUMENT_CONTROL",
  "PURCHASING",
  "CUSTOMER_PRODUCT",
  "TRACEABILITY",
  "PROCESS_CONTROL",
  "INSPECTION_TESTING",
  "NONCONFORMING_PRODUCT",
  "CORRECTIVE_ACTION",
  "HANDLING_STORAGE",
  "QUALITY_RECORDS",
  "INTERNAL_AUDITS",
  "SERVICING",
] as const;

const createCAPASchema = z.object({
  sourceType: z.enum([
    "AUDIT",
    "CUSTOMER_COMPLAINT",
    "INTERNAL_REVIEW",
    "INCIDENT",
    "OTHER",
  ]),
  sourceReference: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["OBSERVATION", "MINOR", "MAJOR", "CRITICAL"]),
  isoElement: z.enum(isoElements).optional(),
  dueDate: z.string().transform((s) => new Date(s)),
  assignedTo: z.string().optional(),
  assignedToName: z.string().optional(),
});

async function generateCAPANumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.cAPARecord.count({
    where: {
      organizationId,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  return `CAPA-${year}-${(count + 1).toString().padStart(3, "0")}`;
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const filter: { organizationId: string; status?: string | object } = {
      organizationId: organization.id,
    };

    if (status === "open") {
      filter.status = { in: ["OPEN", "IN_PROGRESS", "PENDING_VERIFICATION"] };
    } else if (status) {
      filter.status = status;
    }

    const capas = await db.cAPARecord.findMany({
      where: filter,
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      include: {
        audit: {
          select: { auditNumber: true },
        },
      },
    });

    // Check for overdue CAPAs and update status
    const now = new Date();
    const overdueIds = capas
      .filter(
        (c) =>
          c.dueDate < now &&
          ["OPEN", "IN_PROGRESS"].includes(c.status) &&
          c.status !== "OVERDUE"
      )
      .map((c) => c.id);

    if (overdueIds.length > 0) {
      await db.cAPARecord.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: "OVERDUE" },
      });

      // Refetch to get updated statuses
      const updatedCAPAs = await db.cAPARecord.findMany({
        where: filter,
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        include: {
          audit: {
            select: { auditNumber: true },
          },
        },
      });

      return NextResponse.json(updatedCAPAs);
    }

    return NextResponse.json(capas);
  } catch (error) {
    console.error("Failed to fetch CAPAs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
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
    const data = createCAPASchema.parse(body);

    const capaNumber = await generateCAPANumber(organization.id);

    const capa = await db.cAPARecord.create({
      data: {
        organizationId: organization.id,
        capaNumber,
        sourceType: data.sourceType,
        sourceReference: data.sourceReference,
        title: data.title,
        description: data.description,
        severity: data.severity,
        isoElement: data.isoElement,
        dueDate: data.dueDate,
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
        evidenceKeys: [],
      },
    });

    return NextResponse.json(capa);
  } catch (error) {
    console.error("Failed to create CAPA:", error);
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
