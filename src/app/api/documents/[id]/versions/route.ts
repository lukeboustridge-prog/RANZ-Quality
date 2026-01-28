import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import {
  addDocumentVersion,
  generateFileHash,
  getVersionHistory,
} from "@/lib/document-versioning";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;

    // Verify document belongs to org
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        organization: { clerkOrgId: orgId },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const versions = await getVersionHistory(documentId);

    return NextResponse.json(versions);
  } catch (error) {
    console.error("Failed to fetch versions:", error);
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
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;

    // Verify document belongs to org
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        organization: { clerkOrgId: orgId },
        deletedAt: null,
      },
      include: { organization: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const changeNotes = formData.get("changeNotes") as string;
    const isMajorVersion = formData.get("isMajorVersion") === "true";

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

    if (!changeNotes) {
      return NextResponse.json(
        { error: "Change notes are required" },
        { status: 400 }
      );
    }

    // Upload file to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = generateFileHash(buffer);
    const fileName = `documents/${document.organizationId}/${documentId}/${Date.now()}-${file.name}`;
    const storageKey = await uploadToR2(buffer, fileName, file.type);

    // Create new version
    const { versionId, versionString } = await addDocumentVersion({
      documentId,
      storageKey,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileHash,
      createdBy: userId,
      changeNotes,
      isMajorVersion,
    });

    // Update compliance score
    await updateOrganizationComplianceScore(document.organizationId);

    return NextResponse.json({
      versionId,
      versionString,
      message: `Version ${versionString} created successfully`,
    });
  } catch (error) {
    console.error("Failed to create version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
