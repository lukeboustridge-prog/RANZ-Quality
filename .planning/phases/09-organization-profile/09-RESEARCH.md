# Phase 9: Organization Profile - Research

**Researched:** 2026-01-31
**Domain:** Organization settings, image upload, notification preferences
**Confidence:** HIGH

## Summary

Phase 9 implements organization profile management allowing org admins to maintain their company's public-facing information and configure notification preferences. This phase builds on existing infrastructure:

1. **Organization Model** - Already exists with `name`, `tradingName`, `email`, `phone`, `address`, `city` fields
2. **Notification Preferences** - `NotificationPreference` model exists but is user-scoped; need org-level preferences
3. **File Upload (R2)** - Established pattern in `src/lib/r2.ts` for logo uploads
4. **Role-Based Access** - `OrgMemberRole` enum with OWNER/ADMIN/STAFF; need to restrict settings to OWNER/ADMIN

The codebase already has the sidebar link to `/settings` but no settings page exists yet. The notification preference API exists at `/api/notifications/preferences` but is user-scoped. Phase 9 extends this to organization-level notification routing.

**Primary recommendation:** Create settings page with tabbed interface (Profile, Notifications), leveraging existing R2 upload patterns and NotificationPreference model extension.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | 16.x | App Router pages | Already in use |
| React | 19.x | UI components | Already in use |
| Prisma | 6.x | Database ORM | Already in use |
| Clerk | 6.x | Auth + Organizations | Already in use |
| @aws-sdk/client-s3 | 3.x | R2 file uploads | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.x | Form validation | API route validation |
| Tailwind CSS | 4.x | Styling | All UI components |
| Lucide React | Latest | Icons | Settings page icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom file upload | UploadThing | Already have R2 pattern, no need for external service |
| Custom tabs | Radix Tabs | Could add shadcn/ui tabs component if desired |

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── (dashboard)/
│       └── settings/
│           ├── page.tsx              # Settings page (tabs container)
│           ├── profile/
│           │   └── page.tsx          # Profile tab (could be nested route or just components)
│           └── notifications/
│               └── page.tsx          # Notifications tab
├── components/
│   └── settings/
│       ├── organization-profile-form.tsx
│       ├── logo-upload.tsx
│       ├── notification-settings.tsx
│       └── settings-tabs.tsx
└── app/
    └── api/
        └── organizations/
            └── [id]/
                ├── route.ts          # PATCH for org profile updates
                └── logo/
                    └── route.ts      # POST for logo upload
```

### Pattern 1: Admin-Only Access Check
**What:** Verify user has OWNER or ADMIN role before allowing settings access
**When to use:** All settings routes and API endpoints
**Example:**
```typescript
// Source: Existing pattern from cron notifications route
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

async function checkOrgAdmin() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { authorized: false, member: null, organization: null };
  }

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      members: {
        where: { clerkUserId: userId },
        select: { role: true, id: true },
      },
    },
  });

  if (!organization) {
    return { authorized: false, member: null, organization: null };
  }

  const member = organization.members[0];
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return { authorized: false, member: null, organization };
  }

  return { authorized: true, member, organization };
}
```

### Pattern 2: Logo Upload with R2
**What:** Upload company logo to Cloudflare R2, store key in database
**When to use:** Logo upload endpoint
**Example:**
```typescript
// Source: Pattern from src/lib/r2.ts + src/app/api/documents/route.ts
import { uploadToR2 } from "@/lib/r2";

// Generate unique key for logo
const logoKey = `logos/${organizationId}/${Date.now()}-${filename}`;

// Upload to R2
const storageKey = await uploadToR2(buffer, logoKey, mimeType);

// Update organization record
await db.organization.update({
  where: { id: organizationId },
  data: { logoKey: storageKey },
});
```

### Pattern 3: Organization Notification Preferences Schema Extension
**What:** Add organization-level notification routing preferences
**When to use:** Extending notification system for org-wide settings
**Example:**
```prisma
// Extension to existing NotificationPreference
model OrganizationNotificationPreference {
  id             String @id @default(cuid())
  organizationId String @unique

  // Email notification routing
  emailEnabled          Boolean @default(true)
  emailInsuranceAlerts  Boolean @default(true)
  emailAuditAlerts      Boolean @default(true)
  emailComplianceAlerts Boolean @default(true)

  // SMS notification routing
  smsEnabled         Boolean @default(false)
  smsInsuranceAlerts Boolean @default(true)
  smsAuditAlerts     Boolean @default(false)
  smsCriticalAlerts  Boolean @default(true)

  // Primary contact phone for org-level SMS
  smsPhoneNumber String?

  updatedAt DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

### Anti-Patterns to Avoid
- **Storing logo in database blob:** Use R2 for file storage, store only the key in DB
- **Allowing STAFF role to modify settings:** Restrict to OWNER/ADMIN only
- **Mixing user prefs with org prefs:** Keep user notification preferences separate from org-level routing
- **Not validating image files:** Check MIME type and size before upload

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to cloud | Custom S3 client | Existing `uploadToR2()` in `src/lib/r2.ts` | Already handles R2-specific config |
| Image resizing | Sharp pipeline | Browser resize before upload OR accept as-is | Keep backend simple for MVP |
| Form validation | Manual checks | Zod schemas (existing pattern) | Type-safe, reusable validation |
| Phone number formatting | Regex | Accept NZ format (+64...) | Users know their number format |
| Role checking | Custom middleware | Check in API route (existing pattern) | Simpler, consistent with codebase |

**Key insight:** The codebase already has patterns for file upload, form validation, and role checking. Phase 9 is about assembling these patterns into a settings UI, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Not Checking Organization Membership Before Update
**What goes wrong:** User could modify another org's settings if only checking `userId`
**Why it happens:** Forgetting that `orgId` from Clerk session must match the target organization
**How to avoid:** Always verify the current user's `orgId` matches the organization being modified
**Warning signs:** API tests pass but production has cross-org data leaks

### Pitfall 2: Logo URL Expiration in Public Contexts
**What goes wrong:** Signed R2 URLs expire, breaking logo display
**Why it happens:** Using `getSignedDownloadUrl()` for public logo display
**How to avoid:** Either use public bucket access for logos OR serve through an API route that generates fresh signed URLs
**Warning signs:** Logos work initially then break after expiry period

### Pitfall 3: Not Distinguishing User vs Org Notification Preferences
**What goes wrong:** Changing org notification settings affects individual user preferences
**Why it happens:** Reusing the existing `NotificationPreference` model without separation
**How to avoid:** Create `OrganizationNotificationPreference` as separate model
**Warning signs:** User's personal SMS settings change when admin updates org settings

### Pitfall 4: Allowing STAFF Role to Access Settings
**What goes wrong:** Non-admin staff can modify org profile
**Why it happens:** Only checking `userId` authentication, not role authorization
**How to avoid:** Explicit role check for OWNER/ADMIN in both page and API
**Warning signs:** Any org member can access /settings without errors

### Pitfall 5: Large Logo File Uploads Blocking Server
**What goes wrong:** 50MB logo upload times out or exhausts memory
**Why it happens:** Not validating file size before processing
**How to avoid:** Fail-fast size validation (existing pattern: `MAX_FILE_SIZE_BYTES`)
**Warning signs:** Server timeouts on logo upload, memory pressure

## Code Examples

Verified patterns from official sources:

### Organization Profile Update API
```typescript
// Source: Pattern from src/app/api/organizations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tradingName: z.string().max(100).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  city: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get organization and verify membership + role
  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      members: {
        where: { clerkUserId: userId },
        select: { role: true },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const member = organization.members[0];
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden - admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const data = updateOrgSchema.parse(body);

  const updated = await db.organization.update({
    where: { id: organization.id },
    data,
  });

  return NextResponse.json(updated);
}
```

### Logo Upload Route
```typescript
// Source: Pattern from src/app/api/documents/route.ts + src/lib/r2.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role (same pattern as above)
  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      members: {
        where: { clerkUserId: userId },
        select: { role: true },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const member = organization.members[0];
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("logo") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Logo file required" }, { status: 400 });
  }

  if (file.size > MAX_LOGO_SIZE) {
    return NextResponse.json({ error: "Logo must be under 2MB" }, { status: 413 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Logo must be PNG, JPEG, or WebP" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "png";
  const logoKey = `logos/${organization.id}/logo-${Date.now()}.${ext}`;

  const storageKey = await uploadToR2(buffer, logoKey, file.type);

  // Delete old logo if exists (optional cleanup)
  // await deleteFromR2(organization.logoKey);

  await db.organization.update({
    where: { id: organization.id },
    data: { logoKey: storageKey },
  });

  return NextResponse.json({ logoKey: storageKey });
}
```

### Settings Page with Role Guard
```typescript
// Source: Pattern from src/app/(dashboard)/layout.tsx + dashboard pages
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const { userId, orgId } = await auth();

  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding");

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      members: {
        where: { clerkUserId: userId },
        select: { role: true },
      },
    },
  });

  if (!organization) redirect("/dashboard");

  const member = organization.members[0];
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    // Non-admin user - redirect to dashboard
    redirect("/dashboard");
  }

  return (
    <div>
      <h1>Organization Settings</h1>
      {/* Settings tabs here */}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store images in DB | Object storage (R2/S3) | Standard practice | Better performance, cost |
| User-level only prefs | User + Org level prefs | Phase 9 design | Org admins control routing |
| Check auth only | Check auth + role | Existing pattern | Proper authorization |

**Deprecated/outdated:**
- None relevant - the codebase uses modern patterns

## Open Questions

Things that couldn't be fully resolved:

1. **Logo serving approach**
   - What we know: R2 supports signed URLs (existing) or public bucket access
   - What's unclear: Should logos be publicly accessible for verification page?
   - Recommendation: Start with signed URLs served through API route. If performance becomes issue, consider public bucket or CDN.

2. **Organization description field**
   - What we know: Schema doesn't have `description` field yet
   - What's unclear: Is this needed for Phase 9 or Phase 10 (public verification)?
   - Recommendation: Add `description String?` to Organization model if success criteria require it

3. **Notification preference inheritance**
   - What we know: User prefs exist, need org prefs
   - What's unclear: Do org prefs override user prefs, or are they additive?
   - Recommendation: Org prefs determine WHAT notifications are sent to the org. User prefs determine HOW each user receives them. No override needed.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/r2.ts` - R2 upload pattern
- Codebase analysis: `src/app/api/documents/route.ts` - File upload validation
- Codebase analysis: `prisma/schema.prisma` - Organization model, NotificationPreference model
- Codebase analysis: `src/app/api/notifications/preferences/route.ts` - Existing preference API
- Codebase analysis: `src/app/api/cron/notifications/route.ts` - Role-based member queries

### Secondary (MEDIUM confidence)
- [Clerk Organizations Metadata](https://clerk.com/docs/reference/backend/organization/update-organization-metadata) - updateOrganizationMetadata API
- [Clerk RBAC with Organizations](https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions) - Role checking patterns
- [Next.js Project Structure Best Practices](https://nextjsstarter.com/blog/nextjs-14-project-structure-best-practices/) - App Router organization

### Tertiary (LOW confidence)
- General web search on organization settings patterns

## Schema Changes Required

### New Fields on Organization Model
```prisma
model Organization {
  // Existing fields...

  // NEW: Profile fields
  description String?  // Company description for public verification
  logoKey     String?  // R2 storage key for company logo

  // NEW: Relation
  notificationPreference OrganizationNotificationPreference?
}
```

### New Model: OrganizationNotificationPreference
```prisma
model OrganizationNotificationPreference {
  id             String @id @default(cuid())
  organizationId String @unique

  // Email routing preferences
  emailEnabled          Boolean @default(true)
  emailInsuranceAlerts  Boolean @default(true)
  emailAuditAlerts      Boolean @default(true)
  emailComplianceAlerts Boolean @default(true)
  emailSystemAlerts     Boolean @default(true)

  // SMS routing preferences
  smsEnabled         Boolean @default(false)
  smsInsuranceAlerts Boolean @default(true)
  smsAuditAlerts     Boolean @default(false)
  smsCriticalAlerts  Boolean @default(true)

  // Override contact for org-level notifications
  notificationEmail String?  // If different from org.email
  notificationPhone String?  // For SMS notifications

  updatedAt DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}
```

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies
- Architecture: HIGH - Patterns directly from existing codebase
- Pitfalls: HIGH - Based on actual code review of existing upload/auth patterns

**Research date:** 2026-01-31
**Valid until:** 60 days (stable domain, no rapidly changing dependencies)

## Success Criteria Mapping

| Success Criterion | Implementation Approach | Confidence |
|------------------|------------------------|------------|
| 1. Update trading name, contact, description | PATCH `/api/organizations/current` with Zod validation | HIGH |
| 2. Upload/change company logo | POST `/api/organizations/current/logo` using R2 pattern | HIGH |
| 3. Configure notification types | New `OrganizationNotificationPreference` model + API | HIGH |
| 4. Choose notification channels (email/SMS) | Same model, boolean toggles per channel | HIGH |
| 5. Non-admin staff cannot access | Role check in page + API (OWNER/ADMIN only) | HIGH |
