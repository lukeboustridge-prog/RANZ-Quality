# SSO Satellite Domain Setup Guide

This guide documents how to configure the RANZ Roofing Reports app (reports.ranz.org.nz) as a Clerk satellite domain, enabling seamless SSO with the RANZ Quality Program Portal (portal.ranz.org.nz).

## Architecture Overview

```
portal.ranz.org.nz (PRIMARY)    reports.ranz.org.nz (SATELLITE)
┌─────────────────────────┐     ┌─────────────────────────┐
│  RANZ Quality Program   │     │  RANZ Roofing Reports   │
│                         │     │                         │
│  - Handles all sign-in  │◄────│  - Reads session from   │
│  - Issues session token │     │    primary domain       │
│  - Manages user data    │     │  - Redirects to primary │
│  - Syncs org metadata   │     │    for authentication   │
└─────────────────────────┘     └─────────────────────────┘
```

Users sign in once at portal.ranz.org.nz. When they navigate to reports.ranz.org.nz, the satellite domain automatically recognizes their session.

## Prerequisites

- [ ] Access to the same Clerk instance as the portal (same publishable/secret keys)
- [ ] DNS access for production domain configuration
- [ ] Access to Clerk Dashboard for JWT template configuration

## Step 1: Environment Variables (Roofing Reports App)

Add these environment variables to the Roofing Reports app `.env` file:

```bash
# Clerk Authentication (SAME keys as portal)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxx"  # Same as portal
CLERK_SECRET_KEY="sk_live_xxx"                   # Same as portal

# Satellite Domain Configuration
NEXT_PUBLIC_CLERK_IS_SATELLITE="true"
NEXT_PUBLIC_CLERK_DOMAIN="reports.ranz.org.nz"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="https://portal.ranz.org.nz/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="https://portal.ranz.org.nz/sign-up"
```

**Critical:** Both apps MUST use the same Clerk instance keys. The satellite reads session state from the primary domain.

### Development Environment

For local development, use:

```bash
NEXT_PUBLIC_CLERK_IS_SATELLITE="true"
NEXT_PUBLIC_CLERK_DOMAIN="localhost:3001"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="http://localhost:3000/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="http://localhost:3000/sign-up"
```

## Step 2: ClerkProvider Configuration (Roofing Reports App)

Update `src/app/layout.tsx` in the Roofing Reports app:

```tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

**Note:** Environment variables can also be used for these props, but explicit props provide clearer documentation.

## Step 3: Middleware Configuration (Roofing Reports App)

Update `src/middleware.ts` in the Roofing Reports app:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/public(.*)",
  // Add any other public routes
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isPublicRoute(req)) {
      return NextResponse.next();
    }
    await auth.protect();
    return NextResponse.next();
  },
  // Satellite domain options (second argument)
  (req) => ({
    isSatellite: true,
    domain: req.nextUrl.host,  // Dynamic for staging/preview
    signInUrl: "https://portal.ranz.org.nz/sign-in",
    signUpUrl: "https://portal.ranz.org.nz/sign-up",
  })
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

**Key difference from primary:** The middleware includes a second argument with satellite-specific options.

## Step 4: DNS Configuration (Production Only)

For production deployment, add a CNAME record:

```
clerk.reports.ranz.org.nz  →  clerk.clerk.com
```

This allows Clerk to issue TLS certificates for the satellite domain.

**Steps:**
1. Log in to DNS provider
2. Add CNAME record: `clerk` subdomain pointing to `clerk.clerk.com`
3. Wait up to 48 hours for DNS propagation
4. Verify in Clerk Dashboard (Domains > Satellites)

**Note:** DNS configuration is NOT required for development (localhost).

## Step 5: Verify Primary Domain Configuration

The portal (portal.ranz.org.nz) already has the required configuration:

```tsx
// src/app/layout.tsx (portal)
<ClerkProvider
  allowedRedirectOrigins={["https://reports.ranz.org.nz"]}
>
```

This allowlist permits the satellite domain to redirect back after authentication.

## Step 6: Accessing Session Claims (Roofing Reports App)

After setup, the Roofing Reports app can access organization metadata from session claims:

### Server Component

```typescript
// Server Component
import { auth } from "@clerk/nextjs/server";

export default async function Dashboard() {
  const { sessionClaims } = await auth();

  const certificationTier = sessionClaims?.certification_tier as string;
  const complianceScore = sessionClaims?.compliance_score as number;
  const insuranceValid = sessionClaims?.insurance_valid as boolean;

  // Use for authorization decisions
  if (certificationTier !== "MASTER_ROOFER") {
    // Restrict access to premium features
  }
}
```

### Client Component

```typescript
// Client Component
"use client";

import { useAuth } from "@clerk/nextjs";

export function ComplianceBadge() {
  const { sessionClaims } = useAuth();
  const tier = sessionClaims?.certification_tier as string;

  return <span>{tier}</span>;
}
```

## Step 7: Clerk Dashboard JWT Template Configuration

**This is a MANUAL step that must be done in Clerk Dashboard:**

### What to Configure

Add custom session claims to embed organization metadata in JWT tokens.

**Location:** Clerk Dashboard > Sessions > Customize session token

**Add this JSON to the session token template:**

```json
{
  "certification_tier": "{{org.public_metadata.certification_tier}}",
  "compliance_score": "{{org.public_metadata.compliance_score}}",
  "insurance_valid": "{{org.public_metadata.insurance_valid}}"
}
```

### Steps

1. Log in to Clerk Dashboard at https://dashboard.clerk.com
2. Select the RANZ production instance
3. Navigate to: **Sessions** (left sidebar) > **Customize session token**
4. In the "Custom claims" JSON editor, add the three fields above
5. Click **Save changes**

### Important Notes

- Total custom claims must be under 1.2KB (these three fields are ~100 bytes)
- Claims use snake_case to match the metadata keys set by `syncOrgMetadataToClerk`
- Changes apply to new sessions; existing sessions update on next 60-second refresh

### Verification

After saving, you can verify by:

1. Sign in to portal.ranz.org.nz
2. Open browser DevTools > Application > Cookies
3. Find the `__session` cookie
4. Decode the JWT at jwt.io (paste the cookie value)
5. Confirm the custom claims appear in the payload

## Troubleshooting

### Infinite Redirect Loop

**Symptom:** Browser alternates between portal and reports domains without loading.

**Cause:** Middleware protecting routes that should be public.

**Fix:** Ensure `isPublicRoute` includes all necessary public paths.

### Session Not Recognized

**Symptom:** User logged in at portal but reports app shows logged out.

**Cause:** Missing DNS CNAME record (production) or different Clerk instance keys.

**Fix:** Verify CNAME record exists, verify same keys in both apps.

### Stale Session Claims

**Symptom:** Compliance score updated but old value shown.

**Cause:** Session tokens refresh every 60 seconds.

**Fix:** Force refresh with `getToken({ skipCache: true })` or wait 60 seconds.

### Passkeys Not Working

**Symptom:** Passkeys work on portal but fail on reports.

**Cause:** WebAuthn is domain-bound; passkeys cannot be shared across domains.

**Fix:** Use alternative authentication methods (email/password, OAuth, magic links).

## Verification Checklist

- [ ] Same Clerk publishable/secret keys in both apps
- [ ] `NEXT_PUBLIC_CLERK_IS_SATELLITE=true` in reports app
- [ ] ClerkProvider has `isSatellite`, `domain`, `signInUrl` props
- [ ] Middleware includes satellite options as second argument
- [ ] DNS CNAME record added (production only)
- [ ] JWT template configured in Clerk Dashboard (see Step 7 above)
- [ ] Test: Log in at portal, navigate to reports, session recognized
- [ ] Test: Session claims visible in DevTools (JWT decoded)

## Testing the Integration

### Local Development Testing

1. Start portal at `localhost:3000`
2. Start reports at `localhost:3001`
3. Sign in at `localhost:3000/sign-in`
4. Navigate to `localhost:3001`
5. Verify session recognized (no redirect to sign-in)
6. Check browser console for any Clerk errors

### Production Testing

1. Sign in at `https://portal.ranz.org.nz/sign-in`
2. Navigate to `https://reports.ranz.org.nz`
3. Verify immediate authentication (no sign-in prompt)
4. Open DevTools > Application > Cookies
5. Verify `__session` cookie exists on both domains
6. Decode JWT and verify custom claims present

## Support

For Clerk-specific issues, refer to:
- Clerk Satellite Domains: https://clerk.com/docs/deployments/satellite-domains
- Clerk Session Claims: https://clerk.com/docs/backend-requests/making/custom-session-token

For RANZ-specific setup assistance:
- Contact: luke@ranz.org.nz
- Technical Lead: Luke Boustridge
