import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";
import { AUDIT_QUESTIONS } from "@/lib/audit-templates";
import type { AuditStatus } from "@prisma/client";

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

const createAuditSchema = z.object({
  auditType: z.enum([
    "INITIAL_CERTIFICATION",
    "SURVEILLANCE",
    "RECERTIFICATION",
    "FOLLOW_UP",
    "SPECIAL",
  ]),
  scheduledDate: z.string().transform((s) => new Date(s)),
  scope: z.string().optional(),
  isoElements: z.array(z.enum(isoElements)).min(1),
  auditorId: z.string().optional(),
  auditorName: z.string().optional(),
  auditorEmail: z.string().email().optional(),
});

async function generateAuditNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.audit.count({
    where: {
      organizationId,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  return `AUD-${year}-${(count + 1).toString().padStart(3, "0")}`;
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

    const filter: { organizationId: string; status?: AuditStatus } = {
      organizationId: organization.id,
    };

    if (status) {
      filter.status = status as AuditStatus;
    }

    const audits = await db.audit.findMany({
      where: filter,
      orderBy: { scheduledDate: "desc" },
      include: {
        _count: {
          select: { checklist: true, capaRecords: true },
        },
      },
    });

    return NextResponse.json(audits);
  } catch (error) {
    console.error("Failed to fetch audits:", error);
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
    const data = createAuditSchema.parse(body);

    const auditNumber = await generateAuditNumber(organization.id);

    // Create audit with checklist items
    const audit = await db.$transaction(async (tx) => {
      const createdAudit = await tx.audit.create({
        data: {
          organizationId: organization.id,
          auditNumber,
          auditType: data.auditType,
          scheduledDate: data.scheduledDate,
          scope: data.scope,
          isoElements: data.isoElements,
          auditorId: data.auditorId,
          auditorName: data.auditorName,
          auditorEmail: data.auditorEmail,
        },
      });

      // Create checklist items for each element
      const checklistItems = [];
      for (const element of data.isoElements) {
        const questions = AUDIT_QUESTIONS[element] || [];
        for (const question of questions) {
          checklistItems.push({
            auditId: createdAudit.id,
            isoElement: element,
            questionNumber: question.questionNumber,
            questionText: question.questionText,
            evidenceKeys: [],
          });
        }
      }

      if (checklistItems.length > 0) {
        await tx.auditChecklist.createMany({ data: checklistItems });
      }

      return createdAudit;
    });

    return NextResponse.json(audit);
  } catch (error) {
    console.error("Failed to create audit:", error);
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
