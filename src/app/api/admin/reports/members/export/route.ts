import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { createAuditLog } from "@/lib/audit-log";
import { CertificationTier } from "@prisma/client";

/**
 * CSV Export API for Member Directory
 *
 * Returns comprehensive member data with dimension scores for
 * external consumption by insurers and partners.
 *
 * Query params:
 *   - tier: Filter by certification tier (optional)
 *
 * Returns:
 *   - CSV file with 16 columns including NZBN and dimension scores
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Authorization: RANZ admin or auditor only
    const userRole = sessionClaims?.metadata?.role as string | undefined;
    if (userRole !== "ranz:admin" && userRole !== "ranz:auditor") {
      return new Response("Forbidden", { status: 403 });
    }

    // Parse optional tier filter
    const { searchParams } = new URL(req.url);
    const tierParam = searchParams.get("tier");
    const tier = tierParam ? (tierParam as CertificationTier) : null;

    // Build query filter
    const where = tier ? { certificationTier: tier } : {};

    // Query all organizations with cached dimension scores
    const organizations = await db.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        tradingName: true,
        nzbn: true,
        email: true,
        phone: true,
        city: true,
        certificationTier: true,
        complianceScore: true,
        complianceDocScore: true,
        complianceInsScore: true,
        compliancePersScore: true,
        complianceAuditScore: true,
        certifiedSince: true,
        lastAuditDate: true,
        _count: { select: { members: true } },
        insurancePolicies: {
          where: { expiryDate: { gt: new Date() } },
          select: { id: true },
        },
      },
      orderBy: [{ certificationTier: "desc" }, { name: "asc" }],
    });

    // CSV headers
    const headers = [
      "name",
      "tradingName",
      "nzbn",
      "tier",
      "complianceScore",
      "docScore",
      "insScore",
      "persScore",
      "auditScore",
      "lastAuditDate",
      "insuranceStatus",
      "memberCount",
      "city",
      "email",
      "phone",
      "certifiedSince",
    ];

    // Helper: Escape CSV values (handle commas, quotes, newlines)
    function escapeCSV(value: string | null | undefined): string {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    // Map organizations to CSV rows
    const rows = organizations.map((org) =>
      [
        escapeCSV(org.name),
        escapeCSV(org.tradingName),
        escapeCSV(org.nzbn),
        org.certificationTier,
        org.complianceScore,
        org.complianceDocScore,
        org.complianceInsScore,
        org.compliancePersScore,
        org.complianceAuditScore,
        org.lastAuditDate ? format(org.lastAuditDate, "yyyy-MM-dd") : "",
        org.insurancePolicies.length > 0 ? "CURRENT" : "EXPIRED",
        org._count.members,
        escapeCSV(org.city),
        escapeCSV(org.email),
        escapeCSV(org.phone),
        org.certifiedSince ? format(org.certifiedSince, "yyyy-MM-dd") : "",
      ].join(",")
    );

    // Combine headers and rows
    const csv = [headers.join(","), ...rows].join("\n");

    // Generate filename with date
    const filename = `ranz-members-${format(new Date(), "yyyy-MM-dd")}.csv`;

    // Audit log export action
    await createAuditLog({
      action: "EXPORT",
      resourceType: "MemberDirectory",
      resourceId: "all",
      metadata: {
        format: "CSV",
        tier: tier || "all",
        count: organizations.length,
      },
    });

    // Return CSV response
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("CSV export failed:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
