import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2, getSignedDownloadUrl } from "@/lib/r2";
import { MAX_FILE_SIZE_BYTES } from "@/types";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

async function getCredentialWithOwnershipCheck(id: string, orgId: string) {
  const credential = await db.staffMicroCredential.findUnique({
    where: { id },
    include: {
      member: { include: { organization: true } },
      definition: true,
    },
  });

  if (!credential) {
    return { credential: null, error: "Credential not found", status: 404 };
  }

  if (credential.member.organization.clerkOrgId !== orgId) {
    return { credential: null, error: "Forbidden", status: 403 };
  }

  return { credential, error: null, status: 200 };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { credential, error, status } =
      await getCredentialWithOwnershipCheck(id, orgId);

    if (!credential) {
      return NextResponse.json({ error }, { status });
    }

    if (credential.status !== "AWARDED") {
      return NextResponse.json(
        { error: "Can only upload evidence for awarded credentials" },
        { status: 400 }
      );
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
          error:
            "Invalid file type. Allowed: PDF, JPEG, PNG, WebP",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const storageKey = `credentials/${credential.member.organizationId}/${credential.memberId}/${credential.id}/${Date.now()}-${fileName}`;

    const fullKey = await uploadToR2(buffer, storageKey, file.type);

    await db.staffMicroCredential.update({
      where: { id: credential.id },
      data: {
        certificateKey: fullKey,
        certificateFileName: fileName,
        certificateUploadedAt: new Date(),
        certificateUploadedBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      fileName,
      storageKey: fullKey,
    });
  } catch (error) {
    console.error("Failed to upload certificate evidence:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { credential, error, status } =
      await getCredentialWithOwnershipCheck(id, orgId);

    if (!credential) {
      return NextResponse.json({ error }, { status });
    }

    if (!credential.certificateKey) {
      return NextResponse.json(
        { error: "No certificate evidence uploaded for this credential" },
        { status: 404 }
      );
    }

    const signedUrl = await getSignedDownloadUrl(credential.certificateKey);

    return NextResponse.json({
      url: signedUrl,
      fileName: credential.certificateFileName,
    });
  } catch (error) {
    console.error("Failed to get certificate evidence:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
