import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateBadgeSVG } from "@/lib/badges";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    const organization = await db.organization.findUnique({
      where: { id: businessId },
      select: {
        name: true,
        certificationTier: true,
        complianceScore: true,
      },
    });

    if (!organization) {
      // Return a placeholder SVG
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="80" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="80" rx="8" fill="#f1f5f9" stroke="#cbd5e1"/>
  <text x="100" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Not Found</text>
</svg>`;

      return new NextResponse(svg, {
        status: 404,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-cache",
        },
      });
    }

    const svg = generateBadgeSVG(
      organization.certificationTier,
      organization.name,
      organization.complianceScore
    );

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Failed to generate badge image:", error);
    return NextResponse.json(
      { error: "Failed to generate badge" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
