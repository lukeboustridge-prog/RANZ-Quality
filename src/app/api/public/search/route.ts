import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const tier = searchParams.get("tier");
    const region = searchParams.get("region");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = {};

    // Search by name or trading name
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { tradingName: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
      ];
    }

    // Filter by tier
    if (tier && ["ACCREDITED", "CERTIFIED", "MASTER_ROOFER"].includes(tier)) {
      where.certificationTier = tier;
    }

    // Filter by region/city
    if (region) {
      where.city = { contains: region, mode: "insensitive" };
    }

    // Only show organizations with a minimum compliance score
    where.complianceScore = { gte: 70 };

    const [organizations, total] = await Promise.all([
      db.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          tradingName: true,
          certificationTier: true,
          city: true,
          complianceScore: true,
          certifiedSince: true,
          _count: {
            select: { members: true },
          },
          insurancePolicies: {
            where: {
              expiryDate: { gt: new Date() },
              policyType: { in: ["PUBLIC_LIABILITY", "PROFESSIONAL_INDEMNITY"] },
            },
            select: { policyType: true },
          },
          testimonials: {
            where: { verified: true, approved: true },
            select: { rating: true },
            take: 100,
          },
        },
        orderBy: [
          { certificationTier: "desc" }, // Master Roofer first
          { complianceScore: "desc" },
          { name: "asc" },
        ],
        take: limit,
        skip: offset,
      }),
      db.organization.count({ where }),
    ]);

    // Transform response
    const results = organizations.map((org) => {
      const hasPublicLiability = org.insurancePolicies.some(
        (p) => p.policyType === "PUBLIC_LIABILITY"
      );
      const hasProfessionalIndemnity = org.insurancePolicies.some(
        (p) => p.policyType === "PROFESSIONAL_INDEMNITY"
      );

      const avgRating =
        org.testimonials.length > 0
          ? org.testimonials.reduce((sum, t) => sum + t.rating, 0) /
            org.testimonials.length
          : null;

      return {
        id: org.id,
        name: org.name,
        tradingName: org.tradingName,
        tier: org.certificationTier,
        city: org.city,
        memberSince: org.certifiedSince?.toISOString().split("T")[0] || null,
        staffCount: org._count.members,
        insuranceValid: hasPublicLiability && hasProfessionalIndemnity,
        rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        reviewCount: org.testimonials.length,
        verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/verify/${org.id}`,
      };
    });

    return NextResponse.json(
      {
        results,
        total,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    console.error("Public search failed:", error);
    return NextResponse.json(
      { error: "Search failed" },
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
