import { db } from "./db";
import type { CertificationTier } from "@prisma/client";
import { COMPLIANCE_THRESHOLDS } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface OpenBadgeCredential {
  "@context": string[];
  type: string[];
  id: string;
  issuer: {
    id: string;
    name: string;
    url: string;
    image: string;
  };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    name: string;
    achievement: {
      id: string;
      type: string[];
      name: string;
      description: string;
      criteria: {
        narrative: string;
      };
      image: string;
    };
  };
}

export interface BadgeInfo {
  businessId: string;
  businessName: string;
  certificationTier: CertificationTier;
  certifiedSince: Date | null;
  complianceScore: number;
  insuranceValid: boolean;
  lastVerified: Date;
  badgeUrl: string;
  verificationUrl: string;
}

// ============================================================================
// Configuration
// ============================================================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://portal.ranz.co.nz";
const CDN_URL = process.env.BADGE_CDN_URL || APP_URL;

const TIER_CONFIG: Record<
  CertificationTier,
  {
    name: string;
    description: string;
    color: string;
    bgColor: string;
  }
> = {
  ACCREDITED: {
    name: "RANZ Accredited",
    description:
      "Accredited roofing business meeting RANZ baseline quality standards",
    color: "#475569",
    bgColor: "#f1f5f9",
  },
  CERTIFIED: {
    name: "RANZ Certified",
    description:
      "Certified roofing business meeting RANZ ISO 9000-style quality standards",
    color: "#2563eb",
    bgColor: "#dbeafe",
  },
  MASTER_ROOFER: {
    name: "RANZ Master Roofer",
    description:
      "Elite roofing business demonstrating exceptional quality management and industry leadership",
    color: "#d97706",
    bgColor: "#fef3c7",
  },
};

// ============================================================================
// Badge Generation
// ============================================================================

export async function generateOpenBadgeCredential(
  organizationId: string
): Promise<OpenBadgeCredential | null> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      insurancePolicies: {
        where: { expiryDate: { gt: new Date() } },
      },
    },
  });

  if (!organization) {
    return null;
  }

  const tierConfig = TIER_CONFIG[organization.certificationTier];
  const now = new Date();

  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    id: `${APP_URL}/api/public/badge/${organizationId}`,
    issuer: {
      id: APP_URL,
      name: "Roofing Association of New Zealand",
      url: "https://ranz.org.nz",
      image: `${CDN_URL}/images/ranz-logo.png`,
    },
    issuanceDate: organization.certifiedSince?.toISOString() || now.toISOString(),
    expirationDate: new Date(
      now.getTime() + 365 * 24 * 60 * 60 * 1000
    ).toISOString(),
    credentialSubject: {
      id: `urn:ranz:business:${organizationId}`,
      name: organization.name,
      achievement: {
        id: `${APP_URL}/certification/${organization.certificationTier.toLowerCase()}`,
        type: ["Achievement"],
        name: tierConfig.name,
        description: tierConfig.description,
        criteria: {
          narrative: `This business has demonstrated compliance with RANZ ${tierConfig.name} requirements including quality management systems, insurance coverage, and personnel qualifications.`,
        },
        image: `${APP_URL}/api/public/badge/${organizationId}/image`,
      },
    },
  };
}

export async function getBadgeInfo(
  organizationId: string
): Promise<BadgeInfo | null> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      insurancePolicies: {
        where: { expiryDate: { gt: new Date() } },
      },
    },
  });

  if (!organization) {
    return null;
  }

  const now = new Date();
  const hasRequiredInsurance =
    organization.insurancePolicies.some(
      (p) => p.policyType === "PUBLIC_LIABILITY"
    ) &&
    organization.insurancePolicies.some(
      (p) => p.policyType === "PROFESSIONAL_INDEMNITY"
    );

  return {
    businessId: organizationId,
    businessName: organization.name,
    certificationTier: organization.certificationTier,
    certifiedSince: organization.certifiedSince,
    complianceScore: organization.complianceScore,
    insuranceValid: hasRequiredInsurance,
    lastVerified: now,
    badgeUrl: `${APP_URL}/api/public/badge/${organizationId}/image`,
    verificationUrl: `${APP_URL}/verify/${organizationId}`,
  };
}

// ============================================================================
// SVG Badge Generation
// ============================================================================

export function generateBadgeSVG(
  tier: CertificationTier,
  businessName: string,
  complianceScore: number
): string {
  const config = TIER_CONFIG[tier];

  // Truncate business name if too long
  const displayName =
    businessName.length > 25 ? businessName.substring(0, 22) + "..." : businessName;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="240" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${config.bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="200" height="240" rx="12" fill="url(#bgGrad)" filter="url(#shadow)" stroke="${config.color}" stroke-width="2"/>

  <!-- RANZ Logo Area -->
  <rect x="60" y="20" width="80" height="80" rx="8" fill="white" stroke="${config.color}" stroke-width="1"/>
  <text x="100" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${config.color}">RANZ</text>
  <text x="100" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="${config.color}">CERTIFIED</text>

  <!-- Tier Badge -->
  <text x="100" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${config.color}">${config.name.toUpperCase()}</text>

  <!-- Business Name -->
  <text x="100" y="145" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#1e293b">${displayName}</text>

  <!-- Compliance Score -->
  <circle cx="100" cy="180" r="25" fill="white" stroke="${config.color}" stroke-width="2"/>
  <text x="100" y="185" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${complianceScore >= COMPLIANCE_THRESHOLDS.COMPLIANT ? '#16a34a' : complianceScore >= COMPLIANCE_THRESHOLDS.AT_RISK ? '#ca8a04' : '#dc2626'}">${complianceScore}%</text>

  <!-- Verification Link -->
  <text x="100" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#64748b">Click to verify at portal.ranz.co.nz</text>
</svg>`;
}

// ============================================================================
// Embeddable Widget Script
// ============================================================================

export function generateEmbedScript(): string {
  return `(function() {
  const badges = document.querySelectorAll('.ranz-badge');

  badges.forEach(function(badge) {
    const businessId = badge.getAttribute('data-business-id');
    const style = badge.getAttribute('data-style') || 'compact';

    if (!businessId) {
      console.error('RANZ Badge: Missing data-business-id attribute');
      return;
    }

    fetch('${APP_URL}/api/public/verify/' + businessId)
      .then(function(response) {
        if (!response.ok) throw new Error('Verification failed');
        return response.json();
      })
      .then(function(data) {
        if (!data.verified) {
          badge.innerHTML = '<span style="color: #dc2626;">Certification not found</span>';
          return;
        }

        const link = document.createElement('a');
        link.href = '${APP_URL}/verify/' + businessId;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const img = document.createElement('img');
        img.src = '${APP_URL}/api/public/badge/' + businessId + '/image';
        img.alt = 'RANZ ' + data.certificationTier + ' Certified';
        img.style.maxWidth = style === 'full' ? '200px' : '120px';

        link.appendChild(img);
        badge.appendChild(link);
      })
      .catch(function(error) {
        console.error('RANZ Badge: Failed to load badge', error);
        badge.innerHTML = '<span style="color: #94a3b8;">Badge unavailable</span>';
      });
  });
})();`;
}
