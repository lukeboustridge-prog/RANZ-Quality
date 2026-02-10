import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2, getSignedDownloadUrl } from "@/lib/r2";
import { MAX_FILE_SIZE_BYTES } from "@/types";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// --- Helpers ---

async function getOrgFromClerk() {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) return null;

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (!organization) return null;
  return { organization, userId };
}

async function verifyInstanceAndItem(
  instanceId: string,
  itemId: string,
  organizationId: string
) {
  const instance = await db.checklistInstance.findUnique({
    where: { id: instanceId },
  });

  if (!instance || instance.organizationId !== organizationId) {
    return { instance: null, item: null, error: "Checklist instance not found", status: 404 };
  }

  const item = await db.checklistItem.findUnique({
    where: { id: itemId },
    include: { section: { include: { template: true } } },
  });

  if (!item || item.section.template.id !== instance.templateId) {
    return { instance: null, item: null, error: "Checklist item not found", status: 404 };
  }

  return { instance, item, error: null, status: 200 };
}

// --- POST: Upload photo evidence ---

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization, userId } = ctx;
    const { id: instanceId, itemId } = await params;

    const { instance, error, status } = await verifyInstanceAndItem(
      instanceId,
      itemId,
      organization.id
    );

    if (!instance) {
      return NextResponse.json({ error }, { status });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds maximum size of 50MB" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Allowed: JPEG, PNG, WebP",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const storageKey = `checklists/${organization.id}/${instanceId}/${itemId}/${Date.now()}-${fileName}`;

    const fullKey = await uploadToR2(buffer, storageKey, file.type);

    // Update completion record: set photo fields and mark as completed
    await db.checklistItemCompletion.upsert({
      where: {
        instanceId_itemId: {
          instanceId,
          itemId,
        },
      },
      create: {
        instanceId,
        itemId,
        photoKey: fullKey,
        photoFileName: fileName,
        completed: true,
        completedAt: new Date(),
        completedBy: userId,
      },
      update: {
        photoKey: fullKey,
        photoFileName: fileName,
        completed: true,
        completedAt: new Date(),
        completedBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      fileName,
      storageKey: fullKey,
    });
  } catch (error) {
    console.error("Failed to upload checklist photo evidence:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --- GET: Download photo evidence (signed URL) ---

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const ctx = await getOrgFromClerk();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organization } = ctx;
    const { id: instanceId, itemId } = await params;

    const { instance, error, status } = await verifyInstanceAndItem(
      instanceId,
      itemId,
      organization.id
    );

    if (!instance) {
      return NextResponse.json({ error }, { status });
    }

    const completion = await db.checklistItemCompletion.findUnique({
      where: {
        instanceId_itemId: {
          instanceId,
          itemId,
        },
      },
    });

    if (!completion?.photoKey) {
      return NextResponse.json(
        { error: "No photo evidence uploaded for this item" },
        { status: 404 }
      );
    }

    const signedUrl = await getSignedDownloadUrl(completion.photoKey);

    return NextResponse.json({
      url: signedUrl,
      fileName: completion.photoFileName,
    });
  } catch (error) {
    console.error("Failed to get checklist photo evidence:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
