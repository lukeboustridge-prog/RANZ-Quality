import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { z } from "zod/v4";
import {
  createDocumentWithVersion,
  generateFileHash,
} from "@/lib/document-versioning";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { logDocumentMutation } from "@/lib/audit-log";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/types";
import type { DocumentStatus, ISOElement, Prisma } from "@prisma/client";

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

const documentTypes = [
  "POLICY",
  "PROCEDURE",
  "FORM",
  "RECORD",
  "CERTIFICATE",
  "OTHER",
] as const;

const createDocumentSchema = z.object({
  title: z.string().min(1),
  isoElement: z.enum(isoElements),
  documentType: z.enum(documentTypes),
  changeNotes: z.string().optional(),
});

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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const isoElement = searchParams.get("isoElement");
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    // Build filter
    const filter: Prisma.DocumentWhereInput = {
      organizationId: organization.id,
    };

    if (status) {
      filter.status = status as DocumentStatus;
    }

    if (isoElement) {
      filter.isoElement = isoElement as ISOElement;
    }

    if (!includeDeleted) {
      filter.deletedAt = null;
    }

    const documents = await db.document.findMany({
      where: filter,
      include: {
        versions: {
          orderBy: [{ versionNumber: "desc" }, { minorVersion: "desc" }],
          take: 1,
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    // Add version string to each document
    const documentsWithVersion = documents.map((doc) => ({
      ...doc,
      latestVersion: doc.versions[0]
        ? `${doc.versions[0].versionNumber}.${doc.versions[0].minorVersion}`
        : "1.0",
      versions: undefined, // Remove versions array from response
    }));

    return NextResponse.json(documentsWithVersion);
  } catch (error) {
    console.error("Failed to fetch documents:", error);
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

    const formData = await req.formData();
    const data = {
      title: formData.get("title") as string,
      isoElement: formData.get("isoElement") as string,
      documentType: formData.get("documentType") as string,
      changeNotes: formData.get("changeNotes") as string | undefined,
    };

    const validatedData = createDocumentSchema.parse(data);
    const file = formData.get("file") as File | null;

    // FAIL-FAST: Validate file size before any processing
    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File exceeds maximum size of ${MAX_FILE_SIZE_MB}MB`,
          details: {
            maxSizeBytes: MAX_FILE_SIZE_BYTES,
            maxSizeMB: MAX_FILE_SIZE_MB,
            actualSizeBytes: file.size,
            actualSizeMB: Math.round(file.size / 1024 / 1024 * 100) / 100,
          }
        },
        { status: 413 }
      );
    }

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Generate file hash for integrity
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = generateFileHash(buffer);

    // Upload to R2
    const fileName = `documents/${organization.id}/${Date.now()}-${file.name}`;
    const storageKey = await uploadToR2(buffer, fileName, file.type);

    // Create document with initial version
    const { documentId, versionId } = await createDocumentWithVersion({
      organizationId: organization.id,
      title: validatedData.title,
      isoElement: validatedData.isoElement,
      documentType: validatedData.documentType,
      storageKey,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileHash,
      uploadedBy: userId,
      changeNotes: validatedData.changeNotes,
    });

    // Log document creation to audit trail
    await logDocumentMutation(
      "CREATE",
      documentId,
      null, // No previous state for CREATE
      {
        title: validatedData.title,
        isoElement: validatedData.isoElement,
        documentType: validatedData.documentType,
        fileName: file.name,
        fileSize: file.size,
      },
      { organizationId: organization.id, versionId }
    );

    // Update compliance score
    await updateOrganizationComplianceScore(organization.id);

    // Get the created document
    const document = await db.document.findUnique({
      where: { id: documentId },
    });

    return NextResponse.json({
      ...document,
      versionId,
      latestVersion: "1.0",
    });
  } catch (error) {
    console.error("Failed to create document:", error);
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
