import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { NZBN_REGEX } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nzbn = searchParams.get('nzbn');
    const name = searchParams.get('name');

    // Require at least one search parameter
    if (!nzbn && !name) {
      return NextResponse.json(
        {
          verified: false,
          error: "Must provide either 'nzbn' or 'name' query parameter. Example: /api/public/verify?nzbn=9429041234567",
        },
        { status: 400 }
      );
    }

    // If NZBN provided, validate format
    if (nzbn && !NZBN_REGEX.test(nzbn)) {
      return NextResponse.json(
        {
          verified: false,
          error: "Invalid NZBN format. NZBN must be exactly 13 digits.",
        },
        { status: 400 }
      );
    }

    // Build query based on provided parameter
    const organization = nzbn
      ? await db.organization.findFirst({
          where: { nzbn: nzbn },
          include: {
            insurancePolicies: {
              where: { expiryDate: { gt: new Date() } },
              select: { policyType: true },
            },
            audits: {
              where: { status: "COMPLETED" },
              orderBy: { completedAt: "desc" },
              take: 1,
              select: { completedAt: true, rating: true },
            },
          },
        })
      : await db.organization.findFirst({
          where: {
            OR: [
              { name: { equals: name!, mode: 'insensitive' } },
              { tradingName: { equals: name!, mode: 'insensitive' } },
            ],
          },
          include: {
            insurancePolicies: {
              where: { expiryDate: { gt: new Date() } },
              select: { policyType: true },
            },
            audits: {
              where: { status: "COMPLETED" },
              orderBy: { completedAt: "desc" },
              take: 1,
              select: { completedAt: true, rating: true },
            },
          },
        });

    if (!organization) {
      return NextResponse.json(
        { verified: false, error: "Business not found" },
        { status: 404 }
      );
    }

    const hasRequiredInsurance =
      organization.insurancePolicies.some(
        (p) => p.policyType === "PUBLIC_LIABILITY"
      ) &&
      organization.insurancePolicies.some(
        (p) => p.policyType === "PROFESSIONAL_INDEMNITY"
      );

    const response = {
      verified: true,
      nzbn: organization.nzbn,
      businessName: organization.name,
      tradingName: organization.tradingName,
      certificationTier: organization.certificationTier,
      certifiedSince: organization.certifiedSince?.toISOString() || null,
      complianceScore: organization.complianceScore,
      insuranceValid: hasRequiredInsurance,
      lastAudit: organization.audits[0]
        ? {
            date: organization.audits[0].completedAt,
            rating: organization.audits[0].rating,
          }
        : null,
      lastVerified: new Date().toISOString(),
      // Badge URL uses NZBN if available, otherwise internal ID for backwards compat
      badgeUrl: organization.nzbn
        ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/public/badge/${organization.id}/image`
        : `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/public/badge/${organization.id}/image`,
    };

    return NextResponse.json(response, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Verification failed:", error);
    return NextResponse.json(
      { verified: false, error: "Verification failed" },
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
