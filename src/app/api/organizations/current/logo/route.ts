import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization and verify membership + role
    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
      include: {
        members: {
          where: { clerkUserId: userId },
          select: { role: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const member = organization.members[0];
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden - admin access required" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("logo") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Logo file required" }, { status: 400 });
    }

    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json({ error: "Logo must be under 2MB" }, { status: 413 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Logo must be PNG, JPEG, or WebP" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "png";
    const logoKey = `logos/${organization.id}/logo-${Date.now()}.${ext}`;

    const storageKey = await uploadToR2(buffer, logoKey, file.type);

    // Delete old logo if exists
    if (organization.logoKey) {
      try {
        await deleteFromR2(organization.logoKey);
      } catch (e) {
        // Log but don't fail - old logo cleanup is best-effort
        console.warn("Failed to delete old logo:", e);
      }
    }

    await db.organization.update({
      where: { id: organization.id },
      data: { logoKey: storageKey },
    });

    return NextResponse.json({ logoKey: storageKey });
  } catch (error) {
    console.error("Failed to upload logo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
