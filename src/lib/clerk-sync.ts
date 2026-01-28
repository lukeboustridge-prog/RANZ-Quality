import { clerkClient } from "@clerk/nextjs/server";
import { db } from "./db";

/**
 * Sync organization certification data to Clerk public_metadata
 * for JWT session claim embedding.
 *
 * This enables the Roofing Reports satellite domain to access
 * certification_tier and compliance_score via session claims.
 *
 * Note: Metadata changes appear in session tokens after the next
 * automatic refresh (60 seconds) unless client forces refresh.
 */
export async function syncOrgMetadataToClerk(
  organizationId: string,
  data: {
    certificationTier: string;
    complianceScore: number;
    insuranceValid: boolean;
  }
): Promise<void> {
  // Get clerkOrgId from database
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { clerkOrgId: true },
  });

  if (!org?.clerkOrgId) {
    console.warn(
      `[clerk-sync] Organization ${organizationId} has no clerkOrgId, skipping metadata sync`
    );
    return;
  }

  try {
    const client = await clerkClient();
    await client.organizations.updateOrganizationMetadata(org.clerkOrgId, {
      publicMetadata: {
        certification_tier: data.certificationTier,
        compliance_score: data.complianceScore,
        insurance_valid: data.insuranceValid,
      },
    });

    console.log(
      `[clerk-sync] Synced metadata for org ${organizationId}: tier=${data.certificationTier}, score=${data.complianceScore}, insurance=${data.insuranceValid}`
    );
  } catch (error) {
    // Log error but don't throw - metadata sync should not block operations
    console.error(
      `[clerk-sync] Failed to sync metadata for org ${organizationId}:`,
      error
    );
  }
}
