import { db } from "./db";
import type { ISOElement, DocumentType, DocumentStatus } from "@prisma/client";
import { createHash } from "crypto";

// ============================================================================
// Document Number Generation
// ============================================================================

const ISO_ELEMENT_PREFIXES: Record<ISOElement, string> = {
  QUALITY_POLICY: "QP",
  QUALITY_OBJECTIVES: "QO",
  ORG_STRUCTURE: "OS",
  PROCESS_MANAGEMENT: "PM",
  DOCUMENTATION: "DOC",
  TRAINING_COMPETENCE: "TC",
  CONTRACT_REVIEW: "CR",
  DOCUMENT_CONTROL: "DC",
  PURCHASING: "PUR",
  CUSTOMER_PRODUCT: "CP",
  TRACEABILITY: "TR",
  PROCESS_CONTROL: "PC",
  INSPECTION_TESTING: "IT",
  NONCONFORMING_PRODUCT: "NCP",
  CORRECTIVE_ACTION: "CA",
  HANDLING_STORAGE: "HS",
  QUALITY_RECORDS: "QR",
  INTERNAL_AUDITS: "IA",
  SERVICING: "SV",
};

export async function generateDocumentNumber(
  organizationId: string,
  isoElement: ISOElement
): Promise<string> {
  const prefix = ISO_ELEMENT_PREFIXES[isoElement];

  // Count existing documents for this element
  const count = await db.document.count({
    where: {
      organizationId,
      isoElement,
    },
  });

  const sequenceNumber = (count + 1).toString().padStart(3, "0");

  return `${prefix}-${sequenceNumber}`;
}

// ============================================================================
// Version Number Management
// ============================================================================

export function formatVersionString(major: number, minor: number): string {
  return `${major}.${minor}`;
}

export function parseVersionString(version: string): {
  major: number;
  minor: number;
} {
  const [major, minor] = version.split(".").map(Number);
  return { major: major || 1, minor: minor || 0 };
}

export async function getNextVersion(
  documentId: string,
  isMajor: boolean
): Promise<{ versionNumber: number; minorVersion: number }> {
  // Get the latest version
  const latestVersion = await db.documentVersion.findFirst({
    where: { documentId },
    orderBy: [{ versionNumber: "desc" }, { minorVersion: "desc" }],
  });

  if (!latestVersion) {
    return { versionNumber: 1, minorVersion: 0 };
  }

  if (isMajor) {
    return { versionNumber: latestVersion.versionNumber + 1, minorVersion: 0 };
  }

  return {
    versionNumber: latestVersion.versionNumber,
    minorVersion: latestVersion.minorVersion + 1,
  };
}

// ============================================================================
// File Hash Generation
// ============================================================================

export function generateFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// ============================================================================
// Document Creation with Version
// ============================================================================

interface CreateDocumentInput {
  organizationId: string;
  title: string;
  isoElement: ISOElement;
  documentType: DocumentType;
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  uploadedBy: string;
  changeNotes?: string;
}

export async function createDocumentWithVersion(
  input: CreateDocumentInput
): Promise<{ documentId: string; versionId: string }> {
  const documentNumber = await generateDocumentNumber(
    input.organizationId,
    input.isoElement
  );

  const result = await db.$transaction(async (tx) => {
    // Create the document
    const document = await tx.document.create({
      data: {
        organizationId: input.organizationId,
        documentNumber,
        title: input.title,
        isoElement: input.isoElement,
        documentType: input.documentType,
        currentVersion: 1,
        status: "DRAFT",
        storageKey: input.storageKey,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileHash: input.fileHash,
        uploadedBy: input.uploadedBy,
      },
    });

    // Create the initial version
    const version = await tx.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        minorVersion: 0,
        storageKey: input.storageKey,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileHash: input.fileHash,
        status: "DRAFT",
        changeNotes: input.changeNotes || "Initial version",
        createdBy: input.uploadedBy,
      },
    });

    return { documentId: document.id, versionId: version.id };
  });

  return result;
}

// ============================================================================
// Add New Version to Existing Document
// ============================================================================

interface AddVersionInput {
  documentId: string;
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  createdBy: string;
  changeNotes: string;
  isMajorVersion: boolean;
}

export async function addDocumentVersion(
  input: AddVersionInput
): Promise<{ versionId: string; versionString: string }> {
  const { versionNumber, minorVersion } = await getNextVersion(
    input.documentId,
    input.isMajorVersion
  );

  const result = await db.$transaction(async (tx) => {
    // Create the new version
    const version = await tx.documentVersion.create({
      data: {
        documentId: input.documentId,
        versionNumber,
        minorVersion,
        storageKey: input.storageKey,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileHash: input.fileHash,
        status: "DRAFT",
        changeNotes: input.changeNotes,
        createdBy: input.createdBy,
      },
    });

    // Update document's current version
    await tx.document.update({
      where: { id: input.documentId },
      data: {
        currentVersion: versionNumber,
        storageKey: input.storageKey,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileHash: input.fileHash,
        status: "DRAFT", // Reset to draft for new version
      },
    });

    return version;
  });

  return {
    versionId: result.id,
    versionString: formatVersionString(versionNumber, minorVersion),
  };
}

// ============================================================================
// Approval Workflow
// ============================================================================

export async function submitForApproval(
  versionId: string,
  submittedBy: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    const version = await tx.documentVersion.update({
      where: { id: versionId },
      data: {
        status: "PENDING_APPROVAL",
        submittedBy,
        submittedAt: new Date(),
      },
    });

    await tx.document.update({
      where: { id: version.documentId },
      data: { status: "PENDING_APPROVAL" },
    });
  });
}

export async function approveVersion(
  versionId: string,
  approvedBy: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    // Get the version and document
    const version = await tx.documentVersion.findUnique({
      where: { id: versionId },
      include: { document: true },
    });

    if (!version) {
      throw new Error("Version not found");
    }

    // Mark any previous approved versions as superseded
    await tx.documentVersion.updateMany({
      where: {
        documentId: version.documentId,
        status: "APPROVED",
        id: { not: versionId },
      },
      data: { status: "SUPERSEDED" },
    });

    // Approve this version
    await tx.documentVersion.update({
      where: { id: versionId },
      data: {
        status: "APPROVED",
        reviewedBy: approvedBy,
        reviewedAt: new Date(),
      },
    });

    // Update document status
    await tx.document.update({
      where: { id: version.documentId },
      data: {
        status: "APPROVED",
        approvedBy,
        approvedAt: new Date(),
        // Set review due date (default 1 year from now)
        reviewDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  });
}

export async function rejectVersion(
  versionId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    const version = await tx.documentVersion.update({
      where: { id: versionId },
      data: {
        status: "REJECTED",
        reviewedBy: rejectedBy,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await tx.document.update({
      where: { id: version.documentId },
      data: { status: "DRAFT" },
    });
  });
}

// ============================================================================
// Get Version History
// ============================================================================

export async function getVersionHistory(documentId: string) {
  const versions = await db.documentVersion.findMany({
    where: { documentId },
    orderBy: [{ versionNumber: "desc" }, { minorVersion: "desc" }],
  });

  return versions.map((v) => ({
    ...v,
    versionString: formatVersionString(v.versionNumber, v.minorVersion),
  }));
}

// ============================================================================
// Soft Delete Document
// ============================================================================

export async function softDeleteDocument(
  documentId: string,
  deletedBy: string
): Promise<void> {
  await db.document.update({
    where: { id: documentId },
    data: {
      deletedAt: new Date(),
      deletedBy,
      status: "ARCHIVED",
    },
  });
}

// ============================================================================
// Restore Document
// ============================================================================

export async function restoreDocument(documentId: string): Promise<void> {
  // Find the latest approved version to determine status
  const latestApproved = await db.documentVersion.findFirst({
    where: { documentId, status: "APPROVED" },
    orderBy: [{ versionNumber: "desc" }, { minorVersion: "desc" }],
  });

  await db.document.update({
    where: { id: documentId },
    data: {
      deletedAt: null,
      deletedBy: null,
      status: latestApproved ? "APPROVED" : "DRAFT",
    },
  });
}
