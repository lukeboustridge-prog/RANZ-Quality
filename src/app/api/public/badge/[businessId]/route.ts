import { NextRequest, NextResponse } from "next/server";
import { generateOpenBadgeCredential } from "@/lib/badges";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    const credential = await generateOpenBadgeCredential(businessId);

    if (!credential) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Return Open Badges 3.0 JSON-LD
    return NextResponse.json(credential, {
      headers: {
        "Content-Type": "application/ld+json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Failed to generate badge credential:", error);
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
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
