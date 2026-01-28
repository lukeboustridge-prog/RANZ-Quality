import { db } from "./db";
import type { LBPClass, LBPStatus } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface LBPVerificationResult {
  valid: boolean;
  lbpNumber: string;
  name: string;
  licenseClasses: LBPClass[];
  status: LBPStatus;
  expiryDate: string | null;
  verificationId: string;
  rawResponse?: unknown;
}

export interface LBPApiError {
  code: string;
  message: string;
}

// ============================================================================
// LBP API Client
// ============================================================================

const LBP_API_BASE_URL =
  process.env.LBP_API_BASE_URL || "https://portal.api.business.govt.nz/api/lbp";
const LBP_API_KEY = process.env.LBP_API_KEY;

export async function verifyLBPLicense(
  lbpNumber: string
): Promise<LBPVerificationResult> {
  // If no API key is configured, use mock verification for development
  if (!LBP_API_KEY) {
    console.warn("LBP_API_KEY not configured, using mock verification");
    return mockVerifyLBP(lbpNumber);
  }

  try {
    const response = await fetch(
      `${LBP_API_BASE_URL}/practitioners/${encodeURIComponent(lbpNumber)}`,
      {
        headers: {
          Authorization: `Bearer ${LBP_API_KEY}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          valid: false,
          lbpNumber,
          name: "",
          licenseClasses: [],
          status: "NOT_FOUND",
          expiryDate: null,
          verificationId: `VERIFY-${Date.now()}`,
        };
      }

      throw new Error(`LBP API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Map API response to our format
    // Note: Actual API response format may differ - adjust mapping as needed
    const result: LBPVerificationResult = {
      valid: data.status === "CURRENT",
      lbpNumber: data.lbpNumber || lbpNumber,
      name: data.name || "",
      licenseClasses: mapLicenseClasses(data.licenseClasses || []),
      status: mapStatus(data.status),
      expiryDate: data.expiryDate || null,
      verificationId: `VERIFY-${Date.now()}`,
      rawResponse: data,
    };

    return result;
  } catch (error) {
    console.error("LBP API verification failed:", error);
    throw error;
  }
}

// ============================================================================
// Mock Verification (for development)
// ============================================================================

function mockVerifyLBP(lbpNumber: string): LBPVerificationResult {
  // Generate deterministic mock response based on LBP number
  const hash = lbpNumber.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const isValid = hash % 5 !== 0; // 80% valid
  const isSuspended = !isValid && hash % 3 === 0;

  const status: LBPStatus = isValid
    ? "CURRENT"
    : isSuspended
      ? "SUSPENDED"
      : "NOT_FOUND";

  const expiryDate = isValid
    ? new Date(Date.now() + (hash % 365) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]
    : null;

  return {
    valid: isValid,
    lbpNumber,
    name: isValid ? `Test Practitioner ${lbpNumber}` : "",
    licenseClasses: isValid ? ["ROOFING"] : [],
    status,
    expiryDate,
    verificationId: `MOCK-VERIFY-${Date.now()}`,
  };
}

// ============================================================================
// Status Mapping
// ============================================================================

function mapStatus(apiStatus: string): LBPStatus {
  const statusMap: Record<string, LBPStatus> = {
    CURRENT: "CURRENT",
    SUSPENDED: "SUSPENDED",
    CANCELLED: "CANCELLED",
    EXPIRED: "EXPIRED",
  };

  return statusMap[apiStatus?.toUpperCase()] || "NOT_FOUND";
}

function mapLicenseClasses(apiClasses: string[]): LBPClass[] {
  const classMap: Record<string, LBPClass> = {
    CARPENTRY: "CARPENTRY",
    ROOFING: "ROOFING",
    "DESIGN 1": "DESIGN_1",
    "DESIGN 2": "DESIGN_2",
    "DESIGN 3": "DESIGN_3",
    "SITE 1": "SITE_1",
    "SITE 2": "SITE_2",
    "SITE 3": "SITE_3",
  };

  return apiClasses
    .map((c) => classMap[c.toUpperCase()])
    .filter((c): c is LBPClass => c !== undefined);
}

// ============================================================================
// Verify and Update Member
// ============================================================================

export async function verifyAndUpdateMember(
  memberId: string
): Promise<LBPVerificationResult | null> {
  const member = await db.organizationMember.findUnique({
    where: { id: memberId },
  });

  if (!member || !member.lbpNumber) {
    return null;
  }

  try {
    const result = await verifyLBPLicense(member.lbpNumber);

    // Update member with verification results
    await db.organizationMember.update({
      where: { id: memberId },
      data: {
        lbpVerified: result.valid,
        lbpVerifiedAt: new Date(),
        lbpVerificationId: result.verificationId,
        lbpStatus: result.status,
        lbpLastChecked: new Date(),
        lbpExpiry: result.expiryDate ? new Date(result.expiryDate) : null,
        lbpClass: result.licenseClasses[0] || member.lbpClass,
      },
    });

    return result;
  } catch (error) {
    // Log error but don't throw - mark as check failed
    console.error(`Failed to verify LBP for member ${memberId}:`, error);

    await db.organizationMember.update({
      where: { id: memberId },
      data: {
        lbpLastChecked: new Date(),
      },
    });

    return null;
  }
}

// ============================================================================
// Batch Verification
// ============================================================================

export async function verifyAllLBPNumbers(): Promise<{
  total: number;
  verified: number;
  failed: number;
  statusChanges: Array<{
    memberId: string;
    lbpNumber: string;
    oldStatus: LBPStatus | null;
    newStatus: LBPStatus;
  }>;
}> {
  // Get all members with LBP numbers
  const members = await db.organizationMember.findMany({
    where: {
      lbpNumber: { not: null },
    },
    select: {
      id: true,
      lbpNumber: true,
      lbpStatus: true,
      organizationId: true,
    },
  });

  let verified = 0;
  let failed = 0;
  const statusChanges: Array<{
    memberId: string;
    lbpNumber: string;
    oldStatus: LBPStatus | null;
    newStatus: LBPStatus;
  }> = [];

  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 10;
  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    const batch = members.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (member) => {
        try {
          const result = await verifyLBPLicense(member.lbpNumber!);

          // Check if status changed
          if (member.lbpStatus !== result.status) {
            statusChanges.push({
              memberId: member.id,
              lbpNumber: member.lbpNumber!,
              oldStatus: member.lbpStatus,
              newStatus: result.status,
            });
          }

          await db.organizationMember.update({
            where: { id: member.id },
            data: {
              lbpVerified: result.valid,
              lbpVerifiedAt: new Date(),
              lbpVerificationId: result.verificationId,
              lbpStatus: result.status,
              lbpLastChecked: new Date(),
              lbpExpiry: result.expiryDate ? new Date(result.expiryDate) : null,
            },
          });

          verified++;
        } catch {
          failed++;
        }
      })
    );

    // Small delay between batches
    if (i + BATCH_SIZE < members.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return {
    total: members.length,
    verified,
    failed,
    statusChanges,
  };
}
