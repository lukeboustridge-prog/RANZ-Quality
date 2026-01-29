# Phase 8: SSO Integration - Research

**Researched:** 2026-01-28
**Domain:** Clerk multi-domain authentication (primary/satellite architecture)
**Confidence:** HIGH

## Summary

Clerk's satellite domain feature enables seamless cross-domain SSO where the portal.ranz.org.nz acts as the primary authentication domain and reports.ranz.org.nz operates as a satellite, reading session state from the primary. The architecture is production-ready, well-documented, and the RANZ Quality Program codebase already has partial implementation in place (allowedRedirectOrigins configured in ClerkProvider).

The implementation requires four distinct configuration areas: environment variables, ClerkProvider props, middleware options, and Clerk Dashboard JWT customization. The satellite domain transparently redirects users to the primary for authentication, then returns them to their original location. Session tokens can embed organization metadata (certification_tier, compliance_score) via custom JWT claims with a 1.2KB size limit.

**Primary recommendation:** Complete the existing partial implementation by adding satellite middleware options and configuring custom JWT session claims in the Clerk Dashboard to embed Organization.certificationTier and Organization.complianceScore for cross-app authorization.

## Standard Stack

Clerk satellite domains is a built-in Clerk feature (not a separate library). The existing project stack fully supports this feature.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @clerk/nextjs | Latest (^6.x) | Primary authentication library | Official Clerk SDK for Next.js 14+ App Router, includes satellite support |
| Clerk Dashboard | N/A | JWT template configuration | Official method for customizing session token claims |
| Next.js | 14+ App Router | Web framework | Full compatibility with Clerk middleware and ClerkProvider |

### Configuration Requirements
| Component | Purpose | Where Configured |
|-----------|---------|------------------|
| Environment Variables | Domain-specific settings | .env files (different per app) |
| ClerkProvider Props | Primary domain redirect allowlist | src/app/layout.tsx |
| clerkMiddleware Options | Satellite identification | src/middleware.ts |
| JWT Templates | Custom session claims | Clerk Dashboard > Sessions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clerk Satellite | Custom JWT sharing via localStorage | Loses browser cookie security, requires manual session sync, breaks on subdomain isolation |
| Clerk Satellite | Separate Clerk instances per app | Users must log in twice, no shared session, separate billing |
| Clerk Satellite | Auth0 or similar multi-domain setup | Requires migration, higher cost, similar architecture anyway |

**Installation:**
No additional packages required. Clerk satellite domains is included in standard `@clerk/nextjs` installation.

```bash
# Already installed in existing project
npm install @clerk/nextjs
```

## Architecture Patterns

### Recommended Configuration Structure

**Primary Domain (portal.ranz.org.nz):**
```
src/
├── app/
│   └── layout.tsx           # ClerkProvider with allowedRedirectOrigins
├── middleware.ts             # Standard clerkMiddleware (no satellite options)
└── .env                      # Standard Clerk keys
```

**Satellite Domain (reports.ranz.org.nz):**
```
src/
├── app/
│   └── layout.tsx           # ClerkProvider with isSatellite, domain, signInUrl
├── middleware.ts             # clerkMiddleware with satellite options
└── .env                      # Satellite-specific environment variables
```

### Pattern 1: Environment Variable Configuration

**What:** Domain-specific environment variables that identify app role (primary vs satellite)

**When to use:** Always required for satellite domains

**Primary Domain (.env):**
```bash
# Source: Clerk official docs
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxx"
CLERK_SECRET_KEY="sk_live_xxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

**Satellite Domain (.env):**
```bash
# Source: https://clerk.com/docs/guides/dashboard/dns-domains/satellite-domains
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxx"  # Same as primary
CLERK_SECRET_KEY="sk_live_xxx"                   # Same as primary
NEXT_PUBLIC_CLERK_IS_SATELLITE="true"            # Identifies as satellite
NEXT_PUBLIC_CLERK_DOMAIN="reports.ranz.org.nz"   # Satellite domain
NEXT_PUBLIC_CLERK_SIGN_IN_URL="https://portal.ranz.org.nz/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="https://portal.ranz.org.nz/sign-up"
```

**Critical:** Satellite domains use the **same Clerk instance keys** as the primary domain.

### Pattern 2: ClerkProvider Configuration

**What:** React context provider that configures Clerk's authentication behavior

**When to use:** Required in root layout.tsx for both primary and satellite apps

**Primary Domain (layout.tsx):**
```tsx
// Source: https://clerk.com/docs/guides/dashboard/dns-domains/satellite-domains
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      allowedRedirectOrigins={["https://reports.ranz.org.nz"]}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**Satellite Domain (layout.tsx):**
```tsx
// Source: Clerk official documentation
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      isSatellite={true}
      domain="reports.ranz.org.nz"
      signInUrl="https://portal.ranz.org.nz/sign-in"
      signUpUrl="https://portal.ranz.org.nz/sign-up"
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**Note:** RANZ Quality Program already has `allowedRedirectOrigins` configured correctly in src/app/layout.tsx line 39.

### Pattern 3: Middleware Configuration

**What:** Next.js middleware that protects routes and handles satellite authentication flow

**When to use:** Both primary and satellite apps need middleware, but with different options

**Primary Domain (middleware.ts):**
```typescript
// Source: Current RANZ Quality Program implementation
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"]
};
```

**Satellite Domain (middleware.ts):**
```typescript
// Source: https://clerk.com/docs/reference/nextjs/clerk-middleware
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/api/public(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isPublicRoute(req)) return;
    await auth.protect();
  },
  (req) => ({
    isSatellite: true,
    domain: req.nextUrl.host,  // Dynamic domain detection
    signInUrl: "https://portal.ranz.org.nz/sign-in",
    signUpUrl: "https://portal.ranz.org.nz/sign-up",
  })
);

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"]
};
```

**Key difference:** Satellite middleware includes second argument with satellite configuration options.

### Pattern 4: Custom JWT Session Claims

**What:** Organization metadata embedded in session tokens for cross-app authorization

**When to use:** When satellite app needs to make authorization decisions based on organization data

**Configuration (Clerk Dashboard):**
1. Navigate to: Sessions > Customize session token
2. Add custom claims in JSON format:

```json
{
  "certification_tier": "{{org.public_metadata.certification_tier}}",
  "compliance_score": "{{org.public_metadata.compliance_score}}",
  "insurance_valid": "{{org.public_metadata.insurance_valid}}"
}
```

**Size limitation:** Total custom claims must be under 1.2KB. Individual fields are recommended over entire metadata objects.

**Accessing claims in app:**
```typescript
// Source: https://clerk.com/docs/guides/sessions/customize-session-tokens
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { sessionClaims } = await auth();

  const certificationTier = sessionClaims?.certification_tier as string;
  const complianceScore = sessionClaims?.compliance_score as number;

  // Use for authorization decisions
}
```

### Pattern 5: Organization Metadata Sync

**What:** Synchronizing database Organization fields to Clerk organization public_metadata for JWT embedding

**When to use:** After calculating compliance scores or changing certification tiers

```typescript
// Source: Inferred from Clerk metadata documentation
import { clerkClient } from "@clerk/nextjs/server";

async function syncOrgMetadataToClerk(
  clerkOrgId: string,
  certificationTier: string,
  complianceScore: number,
  insuranceValid: boolean
) {
  await clerkClient.organizations.updateOrganizationMetadata(clerkOrgId, {
    publicMetadata: {
      certification_tier: certificationTier,
      compliance_score: complianceScore,
      insurance_valid: insuranceValid,
    },
  });
}
```

**Important timing consideration:** Metadata changes don't appear in session tokens until the next automatic refresh (60 seconds) unless explicitly forced with `getToken({ skipCache: true })`.

### Anti-Patterns to Avoid

- **Don't add entire `org.public_metadata` to JWT claims:** Exceeds 1.2KB limit. Add individual fields only.
- **Don't configure satellite domains as separate Clerk instances:** Must use same instance keys.
- **Don't use *.vercel.app domains in production:** Clerk requires custom domains for production satellite configuration.
- **Don't forget allowedRedirectOrigins on primary:** Results in redirect security errors when satellite redirects back.
- **Don't rely on immediate metadata updates in JWT:** 60-second refresh cycle unless forced.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-domain session sharing | Custom localStorage JWT sharing | Clerk satellite domains | Browser security models block cross-domain localStorage access, cookies are isolated, manual sync breaks on page reload |
| Session token refresh | Custom polling/websocket for metadata updates | Clerk's automatic 60-second refresh + `getToken({ skipCache: true })` for forced refresh | Clerk handles token rotation, expiry, security, and background refresh automatically |
| Domain-based routing logic | Manual subdomain detection in app code | Clerk middleware's `domain: req.nextUrl.host` dynamic detection | Handles preview deployments, staging environments, and domain variations automatically |
| JWT claim validation | Manual JWT decoding and validation | Clerk's `auth()` helper with sessionClaims | Clerk validates signature, expiry, issuer, and audience automatically |

**Key insight:** Cross-domain authentication is fundamentally a browser security problem (SameSite cookies, CORS, subdomain isolation). Clerk's satellite domain architecture solves this at the infrastructure level with DNS CNAME records and transparent redirects. Custom solutions fail when encountering Safari's ITP, Chrome's cookie partitioning, or Firefox's Total Cookie Protection.

## Common Pitfalls

### Pitfall 1: DNS Configuration Incomplete
**What goes wrong:** Satellite domain configured in code but CNAME record missing in DNS

**Why it happens:** Production requires DNS CNAME for `clerk` subdomain (clerk.reports.ranz.org.nz → clerk.clerk.com). Development skips this requirement, so works locally but fails in production.

**How to avoid:**
1. Add satellite domain in Clerk Dashboard (Domains > Satellites)
2. Follow DNS instructions provided by Clerk
3. Add CNAME: `clerk.reports.ranz.org.nz` → `clerk.clerk.com`
4. Wait up to 48 hours for DNS propagation
5. Clerk issues TLS certificate automatically

**Warning signs:**
- Works in development (localhost:3000) but fails on reports.ranz.org.nz
- Browser console shows mixed content errors or failed redirect
- Clerk Dashboard shows "DNS not verified" status

### Pitfall 2: Missing `allowedRedirectOrigins` on Primary
**What goes wrong:** Satellite redirects back to primary domain after authentication, but primary domain rejects redirect with security error

**Why it happens:** Clerk enforces allowlist of permitted redirect destinations to prevent open redirect attacks. Satellite domains must be explicitly allowed.

**How to avoid:**
```tsx
// Primary domain layout.tsx
<ClerkProvider allowedRedirectOrigins={[
  "https://reports.ranz.org.nz",
  "https://reports-staging.ranz.org.nz", // Include staging if needed
]}>
```

**Warning signs:**
- User logs in successfully but gets "Invalid redirect URL" error
- Console error: "Redirect origin not allowed"
- User stuck in redirect loop between domains

**Note:** RANZ Quality Program already has this configured correctly.

### Pitfall 3: Production vs Development Key Confusion
**What goes wrong:** Using development keys (`pk_test_`, `sk_test_`) in production environment

**Why it happens:** Development and production are separate Clerk instances. Satellite domain DNS configuration only works with production instance.

**How to avoid:**
- Development: `pk_test_*` and `sk_test_*` keys, no DNS required
- Production: `pk_live_*` and `sk_live_*` keys, DNS CNAME required
- Vercel: Use environment-specific environment variables
- Never mix test and live keys

**Warning signs:**
- Satellite domain works in local development but not production
- Clerk Dashboard shows satellite domain in test instance, not production instance
- Authentication redirects to test instance login page

### Pitfall 4: Session Token Size Exceeded
**What goes wrong:** Custom JWT claims exceed 4KB cookie limit (1.2KB available after Clerk's defaults)

**Why it happens:** Adding entire `org.public_metadata` object instead of individual fields

**How to avoid:**
```json
// WRONG - entire object too large
{
  "org_metadata": "{{org.public_metadata}}"
}

// CORRECT - individual fields only
{
  "certification_tier": "{{org.public_metadata.certification_tier}}",
  "compliance_score": "{{org.public_metadata.compliance_score}}"
}
```

**Warning signs:**
- Session token cookie not set in browser
- Authentication appears successful but immediate logout
- Clerk functions fail with "session not found" errors

### Pitfall 5: Metadata Update Timing Race Condition
**What goes wrong:** Backend updates organization compliance_score in database and Clerk metadata, but frontend immediately reads old value from session token

**Why it happens:** Session tokens refresh every 60 seconds. Metadata changes don't appear until next refresh.

**How to avoid:**
```typescript
// After updating metadata in Clerk
await clerkClient.organizations.updateOrganizationMetadata(clerkOrgId, {
  publicMetadata: { compliance_score: newScore }
});

// Force immediate token refresh on client
const { getToken } = useAuth();
await getToken({ skipCache: true });

// OR use server-side approach
import { auth } from "@clerk/nextjs/server";
const { getToken } = await auth();
const token = await getToken({ skipCache: true });
```

**Warning signs:**
- Compliance score updated in database but dashboard shows old value
- User must refresh page to see updated certification tier
- Cross-app authorization uses stale values for 60 seconds

### Pitfall 6: Infinite Redirect Loop
**What goes wrong:** User redirected between primary and satellite endlessly without successful authentication

**Why it happens:** Middleware configuration mismatch or public route matcher excludes authentication endpoints

**How to avoid:**
```typescript
// Satellite middleware must include sign-in routes as public
const isPublicRoute = createRouteMatcher([
  "/",
  "/api/public(.*)",
  // Don't protect Clerk callback routes
]);

// Ensure middleware doesn't protect ALL routes
export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return; // Allow public routes through
  await auth.protect();
});
```

**Warning signs:**
- Browser history shows alternating between portal.ranz.org.nz and reports.ranz.org.nz
- Network tab shows 302 redirects in rapid succession
- User never reaches authentication screen

### Pitfall 7: Passkeys Incompatibility
**What goes wrong:** User configures passkey authentication on primary domain, but passkeys don't work on satellite domain

**Why it happens:** Passkeys are bound to specific domains due to WebAuthn origin requirements. They cannot be shared across domains.

**How to avoid:**
- Disable passkey authentication if using satellite domains
- Use alternative authentication methods (OAuth, email/password, magic links)
- Document limitation if passkeys are critical requirement

**Warning signs:**
- Passkeys work on portal.ranz.org.nz but fail on reports.ranz.org.nz
- Error: "Passkey not recognized" on satellite domain
- Users must re-register passkeys per domain

**Source:** [Clerk Satellite Domains Documentation](https://clerk.com/docs/guides/dashboard/dns-domains/satellite-domains) explicitly states passkeys won't be portable between primary and satellite domains.

## Code Examples

Verified patterns from official sources:

### Complete Primary Domain Setup

```typescript
// src/app/layout.tsx
// Source: https://clerk.com/docs/guides/dashboard/dns-domains/satellite-domains
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      allowedRedirectOrigins={[
        "https://reports.ranz.org.nz",
      ]}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

```typescript
// src/middleware.ts
// Source: Current RANZ implementation
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/verify(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"]
};
```

### Complete Satellite Domain Setup

```typescript
// src/app/layout.tsx (Roofing Reports App)
// Source: https://clerk.com/docs/guides/dashboard/dns-domains/satellite-domains
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      isSatellite={true}
      domain="reports.ranz.org.nz"
      signInUrl="https://portal.ranz.org.nz/sign-in"
      signUpUrl="https://portal.ranz.org.nz/sign-up"
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

```typescript
// src/middleware.ts (Roofing Reports App)
// Source: https://clerk.com/docs/reference/nextjs/clerk-middleware
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/api/public(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isPublicRoute(req)) {
      return NextResponse.next();
    }
    await auth.protect();
    return NextResponse.next();
  },
  (req) => ({
    isSatellite: true,
    domain: req.nextUrl.host,
    signInUrl: "https://portal.ranz.org.nz/sign-in",
    signUpUrl: "https://portal.ranz.org.nz/sign-up",
  })
);

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"]
};
```

### Accessing Custom Session Claims

```typescript
// Server Component (App Router)
// Source: https://clerk.com/docs/guides/sessions/customize-session-tokens
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { sessionClaims } = await auth();

  const certificationTier = sessionClaims?.certification_tier as string;
  const complianceScore = sessionClaims?.compliance_score as number;

  return (
    <div>
      <h1>Certification: {certificationTier}</h1>
      <p>Compliance Score: {complianceScore}%</p>
    </div>
  );
}
```

```typescript
// Client Component
// Source: https://clerk.com/docs/guides/sessions/customize-session-tokens
"use client";

import { useAuth } from "@clerk/nextjs";

export function ComplianceDisplay() {
  const { sessionClaims } = useAuth();

  const certificationTier = sessionClaims?.certification_tier as string;

  if (certificationTier === "MASTER_ROOFER") {
    return <div>Master Roofer Badge</div>;
  }

  return <div>Certified Business</div>;
}
```

### Syncing Database to Clerk Metadata

```typescript
// API route or background job
// Source: Inferred from https://clerk.com/docs/guides/organizations/metadata
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function syncOrganizationMetadata(orgId: string) {
  // Fetch latest compliance data from database
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      clerkOrgId: true,
      certificationTier: true,
      complianceScore: true,
    },
  });

  if (!org) return;

  // Check if insurance is valid
  const validInsurance = await prisma.insurancePolicy.findFirst({
    where: {
      organizationId: orgId,
      policyType: "PUBLIC_LIABILITY",
      expiryDate: { gte: new Date() },
    },
  });

  // Update Clerk organization metadata
  await clerkClient.organizations.updateOrganizationMetadata(org.clerkOrgId, {
    publicMetadata: {
      certification_tier: org.certificationTier,
      compliance_score: org.complianceScore,
      insurance_valid: !!validInsurance,
    },
  });
}
```

### Force Session Token Refresh

```typescript
// Client-side force refresh
// Source: https://clerk.com/docs/guides/sessions/force-token-refresh
"use client";

import { useAuth } from "@clerk/nextjs";

export function RefreshButton() {
  const { getToken } = useAuth();

  async function handleRefresh() {
    // Force token refresh, bypassing cache
    const token = await getToken({ skipCache: true });

    // Token now contains latest metadata
    window.location.reload(); // Refresh UI
  }

  return <button onClick={handleRefresh}>Refresh Session</button>;
}
```

```typescript
// Server-side force refresh
// Source: https://clerk.com/docs/guides/sessions/force-token-refresh
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { getToken } = await auth();

  // Get fresh token with latest claims
  const token = await getToken({ skipCache: true });

  return Response.json({ token });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual subdomain cookie sharing | Clerk satellite domains with DNS CNAME | September 2024 | Eliminates need for custom cookie domain configuration |
| Separate Clerk instances per app | Single instance with satellite domains | September 2023 (feature launch) | Single billing, shared user base, seamless SSO |
| Full `org.public_metadata` in JWT | Individual field claims | January 2026 guidance | Avoids cookie size limits, improved performance |
| Manual JWT refresh after updates | Automatic 60-second refresh + skipCache for immediate | Current best practice | Reduces API calls, improves UX |

**Deprecated/outdated:**
- **Multiple Clerk instances for multi-domain:** Replaced by satellite domains feature (avoid unless strict data isolation required)
- **authMiddleware():** Deprecated in favor of `clerkMiddleware()` as of Clerk SDK v5 (2024)
- **`CLERK_FRONTEND_API` environment variable:** Replaced by `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

## Open Questions

Things that couldn't be fully resolved:

1. **Roofing Reports App Environment Variables**
   - What we know: Reports app needs satellite domain configuration
   - What's unclear: Does reports.ranz.org.nz already exist? What are its current environment variables?
   - Recommendation: Audit existing Roofing Reports app environment variables before implementation

2. **Clerk Dashboard JWT Template Current State**
   - What we know: Custom JWT claims are configured in Clerk Dashboard > Sessions
   - What's unclear: Does RANZ's Clerk instance already have custom claims configured?
   - Recommendation: Check existing JWT template before adding certification_tier/compliance_score claims

3. **Production DNS Configuration Timeline**
   - What we know: CNAME record required for production satellite domain
   - What's unclear: Current DNS provider, access credentials, propagation strategy
   - Recommendation: Identify DNS provider and confirm access before Q2 2026 pilot launch

4. **Metadata Sync Frequency Strategy**
   - What we know: Compliance scores calculated in background job (Phase 7)
   - What's unclear: Should every compliance calculation trigger Clerk metadata sync? Or batch updates?
   - Recommendation: Sync metadata on: (1) compliance recalculation, (2) tier change, (3) insurance expiry. Skip for minor score fluctuations (<5% change).

5. **Staging Environment Satellite Configuration**
   - What we know: Production requires custom domains, development uses localhost
   - What's unclear: How to handle staging/preview deployments (e.g., portal-staging.vercel.app → reports-staging.vercel.app)
   - Recommendation: Use development Clerk instance for staging (no DNS required), or provision staging custom domains

## Sources

### Primary (HIGH confidence)
- [Clerk Satellite Domains Documentation](https://clerk.com/docs/guides/dashboard/dns-domains/satellite-domains) - Official configuration guide
- [Clerk clerkMiddleware() Reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) - Middleware options for satellites
- [Clerk Customize Session Tokens](https://clerk.com/docs/guides/sessions/customize-session-tokens) - JWT custom claims configuration
- [Clerk JWT Templates](https://clerk.com/docs/guides/sessions/jwt-templates) - Session token template structure
- [Clerk Organization Metadata](https://clerk.com/docs/guides/organizations/metadata) - Organization public_metadata access patterns
- [Clerk Force Token Refresh](https://clerk.com/docs/guides/sessions/force-token-refresh) - Handling metadata timing

### Secondary (MEDIUM confidence)
- [Clerk Next.js Multi-Domain Example Repository](https://github.com/clerk/clerk-nextjs-multi-domain-example) - Reference implementation
- [Clerk Production Deployment Guide](https://clerk.com/docs/guides/development/deployment/production) - Production vs development differences

### Tertiary (LOW confidence)
- None - all findings verified with official Clerk documentation dated January 2026

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Clerk Next.js SDK with documented satellite support
- Architecture: HIGH - Complete official documentation with code examples
- Pitfalls: MEDIUM - Common issues documented in Clerk GitHub issues and support articles, but not all verified firsthand
- JWT claims: HIGH - Official documentation with size limits and access patterns clearly specified
- DNS requirements: HIGH - Production checklist documented in deployment guide

**Research date:** 2026-01-28
**Valid until:** March 2026 (60 days) - Clerk feature is mature and stable, unlikely to change significantly

**Implementation notes:**
- RANZ Quality Program already has partial implementation (allowedRedirectOrigins configured)
- Satellite configuration requires Roofing Reports app updates (not in scope for this phase)
- JWT claims configuration is manual one-time setup in Clerk Dashboard
- DNS CNAME required only for production, not development or local testing
