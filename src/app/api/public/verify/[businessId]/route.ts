import { NextRequest, NextResponse } from "next/server";
import { NZBN_REGEX } from "@/types";

/**
 * DEPRECATED: Legacy verification endpoint using path parameter
 *
 * This endpoint now returns 400 for all requests and directs users to
 * the new query-parameter based endpoint at /api/public/verify?nzbn=...
 *
 * Reason: Prevent enumeration attacks via sequential organization ID guessing.
 * Internal organization IDs (CUID format) should never be exposed in public APIs.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;

  // Check if this looks like an internal organization ID (CUID format)
  // CUIDs typically start with 'cl' (Prisma) or 'cm' and are alphanumeric
  const looksLikeOrgId = /^c[lm][a-z0-9]{20,}$/i.test(businessId);

  // Check if it's a valid NZBN format
  const isValidNzbn = NZBN_REGEX.test(businessId);

  if (looksLikeOrgId) {
    return NextResponse.json(
      {
        verified: false,
        error: "Organization ID lookups are not supported. Please use NZBN or business name.",
        migration: {
          message: "This endpoint has been deprecated to prevent enumeration attacks.",
          newEndpoint: "/api/public/verify",
          examples: [
            "GET /api/public/verify?nzbn=9429041234567",
            "GET /api/public/verify?name=Example%20Roofing%20Ltd"
          ],
          documentation: "https://portal.ranz.org.nz/api-docs"
        }
      },
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      }
    );
  }

  // If it's a valid NZBN, tell them to use the new endpoint
  if (isValidNzbn) {
    return NextResponse.json(
      {
        verified: false,
        error: "Please use the query parameter format for NZBN lookups.",
        redirect: `/api/public/verify?nzbn=${businessId}`,
        migration: {
          message: "Path-based lookups are deprecated. Use query parameters instead.",
          example: `GET /api/public/verify?nzbn=${businessId}`
        }
      },
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      }
    );
  }

  // For anything else, return a generic deprecation message
  return NextResponse.json(
    {
      verified: false,
      error: "This endpoint format is deprecated.",
      migration: {
        message: "Please use the new query parameter format.",
        newEndpoint: "/api/public/verify",
        examples: [
          "GET /api/public/verify?nzbn=9429041234567",
          "GET /api/public/verify?name=Example%20Roofing%20Ltd"
        ]
      }
    },
    {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    }
  );
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
