# Phase 11: Personal Settings - Research

**Researched:** 2026-01-31
**Domain:** User profile management, personal notification preferences, Clerk UserProfile integration
**Confidence:** HIGH

## Summary

Phase 11 implements personal settings allowing individual users to manage their own profile information (name, email, phone, profile photo) and notification preferences independent of their organization's settings. This phase builds on existing infrastructure:

1. **Clerk User Management** - Clerk already manages user profile data (name, email, phone, profile image) with built-in components
2. **NotificationPreference Model** - Already exists in database for user-level notification preferences
3. **Settings Page** - Created in Phase 9 and extended in Phase 10, provides container for all settings
4. **Organization Notifications** - Phase 9 implemented org-level notification routing; Phase 11 adds per-user preferences
5. **Notification API** - `/api/notifications/preferences` already exists with GET/PATCH endpoints

The key architectural decision: **Leverage Clerk's built-in UserProfile component** for profile management (name, email, phone, photo) rather than building custom forms. This approach provides battle-tested security, email verification flows, and automatic synchronization with Clerk's authentication system. For notification preferences, extend the existing database model and API to support per-user opt-in/out settings.

**Primary recommendation:** Add "Personal Settings" section to existing settings page with two subsections: (1) Clerk's `<UserProfile />` component embedded for profile management, and (2) custom notification preferences form using existing API patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @clerk/nextjs | 6.36.x | User profile management | Built-in components, email verification, security |
| Prisma | 6.x | Database ORM | Existing NotificationPreference model |
| Next.js 16 | 16.x | App Router pages | Server components + client interactivity |
| Zod | 4.x | Validation | API route validation (established pattern) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4.x | Styling | All UI components |
| Lucide React | Latest | Icons | Toggle components, status icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clerk UserProfile | Custom profile forms | Clerk provides email verification, security, photo upload - no reason to rebuild |
| Database notifications | Clerk user metadata | Database allows complex queries, notification history - metadata limited to 8KB |
| Custom notification UI | Clerk custom pages | Custom UI provides better integration with org settings display |

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── (dashboard)/
│       └── settings/
│           └── page.tsx              # Add personal settings section
├── components/
│   └── settings/
│       ├── user-profile-section.tsx  # Wrapper for Clerk UserProfile
│       ├── personal-notification-settings.tsx  # User notification prefs
│       └── settings-navigation.tsx   # Tabs: Org Profile | Org Notifications | Staff | Personal
└── app/
    └── api/
        └── notifications/
            └── preferences/
                └── route.ts          # EXISTING: GET/PATCH user notification prefs
```

### Pattern 1: Embedded Clerk UserProfile Component
**What:** Use Clerk's pre-built UserProfile component for managing user account details
**When to use:** User profile management (name, email, phone, profile photo)
**Example:**
```typescript
// Source: https://clerk.com/docs/nextjs/reference/components/user/user-profile
import { UserProfile } from '@clerk/nextjs';

export function UserProfileSection() {
  return (
    <div className="clerk-profile-wrapper">
      <UserProfile
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border border-gray-200',
          }
        }}
      />
    </div>
  );
}
```

### Pattern 2: Conditional Settings Sections (Admin vs User)
**What:** Show different sections based on user role - org settings for admins, personal only for staff
**When to use:** Settings page rendering
**Example:**
```typescript
// Source: Pattern from src/app/(dashboard)/settings/page.tsx
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
  const isAdmin = member && ["OWNER", "ADMIN"].includes(member.role);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Navigation tabs */}
      <SettingsNavigation isAdmin={isAdmin} />

      {/* Admin-only sections */}
      {isAdmin && (
        <>
          <OrganizationProfileSection />
          <StaffManagementSection />
        </>
      )}

      {/* Always visible personal settings */}
      <PersonalSettingsSection />
    </div>
  );
}
```

### Pattern 3: User Notification Preferences (Extend Existing API)
**What:** Toggle user-level notification preferences independent of organization settings
**When to use:** Personal notification opt-in/opt-out
**Example:**
```typescript
// Source: Existing pattern from src/app/api/notifications/preferences/route.ts
// Already implemented - no changes needed to API
// Schema supports:
// - emailEnabled, emailInsurance, emailAudit, emailCompliance, emailNewsletter
// - smsEnabled, smsInsurance, smsAudit, smsCritical
// - smsPhoneNumber

// Client-side usage:
async function updatePreference(field: string, value: boolean) {
  const response = await fetch("/api/notifications/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [field]: value }),
  });

  if (!response.ok) {
    throw new Error("Failed to update preference");
  }

  return response.json();
}
```

### Pattern 4: Notification Preference Hierarchy (Org + User)
**What:** Combine organization-level routing with user-level preferences for final notification decision
**When to use:** Notification service checking if notification should be sent
**Example:**
```typescript
// Conceptual pattern for notification service (not implemented in Phase 11)
async function shouldSendNotification(
  userId: string,
  organizationId: string,
  notificationType: NotificationType,
  channel: NotificationChannel
): Promise<boolean> {
  // Step 1: Check organization preferences (Phase 9)
  const orgPrefs = await db.organizationNotificationPreference.findUnique({
    where: { organizationId }
  });

  if (!orgPrefs) return false; // No org prefs = no notifications

  // Step 2: Check if org has this notification type enabled
  const orgAllows = getOrgChannelPreference(orgPrefs, notificationType, channel);
  if (!orgAllows) return false; // Org disabled this notification type

  // Step 3: Check user preferences (Phase 11)
  const userPrefs = await db.notificationPreference.findUnique({
    where: { userId }
  });

  if (!userPrefs) return true; // No user prefs = use org defaults

  // Step 4: Check if user opted out
  const userAllows = getUserChannelPreference(userPrefs, notificationType, channel);

  return userAllows; // Final decision: org allows AND user allows
}
```

### Anti-Patterns to Avoid
- **Building custom profile photo upload:** Clerk handles this with security and validation built-in
- **Storing user data in database when Clerk has it:** Use Clerk as source of truth for name, email, phone
- **Overriding org notification settings at user level:** User prefs should only opt-OUT, not opt-IN to disabled org notifications
- **Not showing inheritance in UI:** Make it clear which prefs are org-level vs user-level
- **Allowing users to disable critical notifications:** Some notification types (security, critical compliance) should not be user-disableable

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Profile photo upload | Custom file upload | Clerk UserProfile component | Handles validation, security, storage automatically |
| Email change verification | Custom token system | Clerk email verification | Built-in flow with security best practices |
| Profile form validation | Custom validators | Clerk's built-in validation | Email format, phone numbers, required fields |
| Phone number formatting | Regex patterns | Accept user input as-is | International formats vary, Clerk handles this |
| Profile photo cropping | Sharp/Jimp | Browser-based crop OR accept as-is | Keep backend simple, Clerk handles display |
| User preference UI state | Complex state management | Optimistic updates + reload | Existing pattern in notification-settings.tsx |

**Key insight:** Clerk UserProfile is a battle-tested component handling profile management security concerns (email verification, password changes, 2FA, OAuth connections). Building custom forms duplicates functionality and introduces security risks.

## Common Pitfalls

### Pitfall 1: Mixing Clerk User Data with Database User Data
**What goes wrong:** Storing user name/email in both Clerk and database causes sync issues
**Why it happens:** Wanting to query user data without Clerk API calls
**How to avoid:** Use Clerk as single source of truth for profile data. Store only `clerkUserId` in database tables.
**Warning signs:** User updates email in Clerk but database has old email

### Pitfall 2: Not Distinguishing Org vs User Notification Preferences
**What goes wrong:** User notification toggles affect organization-wide settings
**Why it happens:** Reusing OrganizationNotificationPreference model for user prefs
**How to avoid:** Use separate `NotificationPreference` table (already exists) with `userId` key
**Warning signs:** Admin changes org settings and individual staff members complain their prefs changed

### Pitfall 3: Allowing Users to Opt-In to Disabled Org Notifications
**What goes wrong:** User expects to receive notifications that org has disabled
**Why it happens:** Not checking org preferences before user preferences
**How to avoid:** Implement preference hierarchy: org prefs filter first, then user prefs
**Warning signs:** User has SMS enabled but receives nothing because org SMS is disabled

### Pitfall 4: UserProfile Component Styling Conflicts
**What goes wrong:** Clerk's UserProfile component looks out of place in app
**Why it happens:** Clerk uses default styling that may not match app design
**How to avoid:** Use Clerk's `appearance` prop to customize component styling
**Warning signs:** Component has different colors, fonts, spacing than rest of app

### Pitfall 5: Exposing Personal Settings to Non-Authenticated Users
**What goes wrong:** Settings page accessible without login
**Why it happens:** Missing auth check in page component
**How to avoid:** Use existing auth guard pattern from settings page
**Warning signs:** Can access /settings without being logged in

### Pitfall 6: Not Defaulting User Preferences on First Access
**What goes wrong:** User sees empty state or errors when first accessing personal settings
**Why it happens:** NotificationPreference record doesn't exist yet
**How to avoid:** Existing API handles this with upsert pattern - creates defaults if not exists
**Warning signs:** 404 or null pointer errors on first settings page visit

## Code Examples

Verified patterns from official sources:

### Personal Settings Section (Page Integration)
```typescript
// Source: Pattern from src/app/(dashboard)/settings/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { UserProfileSection } from "@/components/settings/user-profile-section";
import { PersonalNotificationSettings } from "@/components/settings/personal-notification-settings";

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
  const isAdmin = member && ["OWNER", "ADMIN"].includes(member.role);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your personal preferences and {isAdmin ? "organization settings" : "account"}
        </p>
      </div>

      <div className="space-y-8">
        {/* Admin-only sections */}
        {isAdmin && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Company Profile
              </h2>
              {/* Organization profile form */}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Organization Notifications
              </h2>
              {/* Organization notification settings */}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Staff Management
              </h2>
              {/* Staff management */}
            </div>
          </>
        )}

        {/* Personal settings - visible to all users */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Personal Profile
          </h2>
          <UserProfileSection />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Personal Notification Preferences
          </h2>
          <PersonalNotificationSettings />
        </div>
      </div>
    </div>
  );
}
```

### Clerk UserProfile Component Wrapper
```typescript
// Source: https://clerk.com/docs/nextjs/reference/components/user/user-profile
// Location: src/components/settings/user-profile-section.tsx
"use client";

import { UserProfile } from '@clerk/nextjs';

export function UserProfileSection() {
  return (
    <div className="clerk-user-profile-container">
      <UserProfile
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border-none',
            navbar: 'hidden', // Hide if only showing account section
            pageScrollBox: 'p-0',
            page: 'p-0',
          },
          variables: {
            colorPrimary: '#2563eb', // Blue-600 to match app theme
          }
        }}
      />
    </div>
  );
}
```

### Personal Notification Settings Component
```typescript
// Source: Adapted from src/components/settings/notification-settings.tsx
// Location: src/components/settings/personal-notification-settings.tsx
"use client";

import { useState, useEffect } from "react";

interface NotificationPreferences {
  id: string;
  emailEnabled: boolean;
  emailInsurance: boolean;
  emailAudit: boolean;
  emailCompliance: boolean;
  emailNewsletter: boolean;
  smsEnabled: boolean;
  smsInsurance: boolean;
  smsAudit: boolean;
  smsCritical: boolean;
  smsPhoneNumber: string | null;
}

export function PersonalNotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch("/api/notifications/preferences");
        if (!response.ok) throw new Error("Failed to fetch preferences");
        const data = await response.json();
        setPreferences(data);
      } catch (error) {
        console.error("Failed to fetch preferences:", error);
        setMessage({ type: "error", text: "Failed to load preferences" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchPreferences();
  }, []);

  const handleToggle = async (field: keyof NotificationPreferences) => {
    if (!preferences) return;

    const newValue = !preferences[field];
    const updatedPreferences = { ...preferences, [field]: newValue };
    setPreferences(updatedPreferences);
    setMessage(null);

    try {
      setIsSaving(true);
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to update preference");
      }

      setMessage({ type: "success", text: "Preference updated" });
      setTimeout(() => setMessage(null), 2000);
    } catch {
      // Revert on error
      setPreferences(preferences);
      setMessage({ type: "error", text: "Failed to update preference" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-red-600 py-4">
        Failed to load notification preferences. Please refresh the page.
      </div>
    );
  }

  const Toggle = ({
    checked,
    onChange,
    disabled = false,
  }: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled || isSaving}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Success/Error Message */}
      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Info banner about organization settings */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These are your personal preferences. Your organization controls which notifications are sent. You can only opt-out of notifications your organization has enabled.
        </p>
      </div>

      {/* Email Notifications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
            <p className="text-sm text-gray-500">Receive notifications via email</p>
          </div>
          <Toggle
            checked={preferences.emailEnabled}
            onChange={() => handleToggle("emailEnabled")}
          />
        </div>

        {preferences.emailEnabled && (
          <div className="ml-4 space-y-4 border-l-2 border-gray-100 pl-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Insurance Alerts</p>
                <p className="text-xs text-gray-500">Policy expiry reminders</p>
              </div>
              <Toggle
                checked={preferences.emailInsurance}
                onChange={() => handleToggle("emailInsurance")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Audit Alerts</p>
                <p className="text-xs text-gray-500">Scheduled audits and reminders</p>
              </div>
              <Toggle
                checked={preferences.emailAudit}
                onChange={() => handleToggle("emailAudit")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Compliance Alerts</p>
                <p className="text-xs text-gray-500">Compliance score changes</p>
              </div>
              <Toggle
                checked={preferences.emailCompliance}
                onChange={() => handleToggle("emailCompliance")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Newsletter & Updates</p>
                <p className="text-xs text-gray-500">RANZ news and program updates</p>
              </div>
              <Toggle
                checked={preferences.emailNewsletter}
                onChange={() => handleToggle("emailNewsletter")}
              />
            </div>
          </div>
        )}
      </div>

      {/* SMS Notifications */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">SMS Notifications</h3>
            <p className="text-sm text-gray-500">Receive urgent notifications via SMS</p>
          </div>
          <Toggle
            checked={preferences.smsEnabled}
            onChange={() => handleToggle("smsEnabled")}
          />
        </div>

        {preferences.smsEnabled && (
          <>
            {/* Phone number field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMS Phone Number
              </label>
              <input
                type="tel"
                value={preferences.smsPhoneNumber || ""}
                onChange={(e) => {
                  // Handle phone number update
                  // This would need a separate update function
                }}
                placeholder="+64 21 XXX XXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="ml-4 space-y-4 border-l-2 border-gray-100 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Insurance Alerts</p>
                  <p className="text-xs text-gray-500">Urgent policy expiry warnings</p>
                </div>
                <Toggle
                  checked={preferences.smsInsurance}
                  onChange={() => handleToggle("smsInsurance")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Audit Alerts</p>
                  <p className="text-xs text-gray-500">Upcoming audit reminders</p>
                </div>
                <Toggle
                  checked={preferences.smsAudit}
                  onChange={() => handleToggle("smsAudit")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Critical Alerts</p>
                  <p className="text-xs text-gray-500">Critical issues requiring immediate attention</p>
                </div>
                <Toggle
                  checked={preferences.smsCritical}
                  onChange={() => handleToggle("smsCritical")}
                  disabled={true} // Cannot disable critical alerts
                />
              </div>
              <p className="text-xs text-gray-500 italic">
                * Critical alerts cannot be disabled for security reasons
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

### Alternative: Clerk UserButton with Profile Access
```typescript
// Source: https://clerk.com/docs/nextjs/reference/components/user/user-button
// Alternative approach: Use UserButton dropdown instead of dedicated settings section
import { UserButton } from '@clerk/nextjs';

export function Header() {
  return (
    <header>
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-10 h-10',
          }
        }}
        // Automatically includes "Manage account" link that opens UserProfile modal
      />
    </header>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom profile forms | Clerk UserProfile component | Clerk v4+ | Better security, built-in verification |
| User metadata in database | Clerk as source of truth | Modern auth pattern | Eliminates sync issues |
| Global notification prefs | User + Org preferences | This phase | Respects both org policy and user choice |
| Separate profile page | Unified settings page | Phase 9-11 | Better UX, single settings location |

**Deprecated/outdated:**
- Custom email verification flows - Clerk handles this
- Manual phone number validation - Clerk validates format
- Profile photo storage in database - Clerk manages image hosting

## Open Questions

Things that couldn't be fully resolved:

1. **Notification Preference Enforcement**
   - What we know: Database has separate NotificationPreference (user) and OrganizationNotificationPreference (org) models
   - What's unclear: Should notification service combine these, or does one override the other?
   - Recommendation: Implement hierarchy in notification service: Org prefs determine WHAT can be sent, user prefs determine WHAT user wants. Final decision is logical AND of both. Phase 11 focuses on UI; notification service updates may be Phase 12.

2. **Clerk UserProfile Customization Limits**
   - What we know: Clerk provides `appearance` prop for styling customization
   - What's unclear: Can we hide certain sections (like security) if we only want profile management?
   - Recommendation: Use full UserProfile component. Users expect security settings in profile section (password, 2FA). Accept Clerk's standard layout.

3. **Phone Number for SMS Notifications**
   - What we know: NotificationPreference model has `smsPhoneNumber` field, Clerk user also has phone
   - What's unclear: Should we use Clerk's phone or separate notification phone?
   - Recommendation: For MVP, accept user input in notification preferences. Future enhancement: pre-populate from Clerk phone if available.

4. **User Profile Photo Display in App**
   - What we know: Clerk manages profile photo, accessible via `user.imageUrl`
   - What's unclear: Do we need to cache or proxy these images?
   - Recommendation: Use Clerk's imageUrl directly. It's a CDN URL, no caching needed.

5. **Staff vs Admin Settings Navigation**
   - What we know: Staff should only see personal settings, admins see everything
   - What's unclear: Should we use tabs, sections, or separate routes?
   - Recommendation: Single settings page with conditional sections. Admins see all, staff see only personal. Use visual dividers, not tabs.

## Sources

### Primary (HIGH confidence)
- [Clerk UserProfile Component - Next.js](https://clerk.com/docs/nextjs/reference/components/user/user-profile) - Official component documentation
- [Clerk UserButton Component - Next.js](https://clerk.com/docs/nextjs/reference/components/user/user-button) - Alternative profile access method
- [Clerk User Metadata](https://clerk.com/docs/guides/users/extending) - User metadata storage options
- [Add custom pages to UserProfile](https://clerk.com/docs/nextjs/guides/customizing-clerk/adding-items/user-profile) - Customization guide
- Codebase analysis: `src/app/api/notifications/preferences/route.ts` - Existing API implementation
- Codebase analysis: `src/components/settings/notification-settings.tsx` - Org notification pattern
- Codebase analysis: `prisma/schema.prisma` - NotificationPreference model
- Codebase analysis: `src/app/(dashboard)/settings/page.tsx` - Settings page structure

### Secondary (MEDIUM confidence)
- [User Settings Database Design (Medium)](https://basila.medium.com/designing-a-user-settings-database-table-e8084fcd1f67) - Database pattern validation
- [Storing User Settings in Relational Database](https://culttt.com/2015/02/02/storing-user-settings-relational-database) - Key-value vs columns approach
- [Next.js 16 Authentication Best Practices](https://medium.com/@reactjsbd/next-js-16-whats-new-for-authentication-and-authorization-1fed6647cfcc) - Modern auth patterns
- Web search: Multiple sources on notification preference UX patterns

### Tertiary (LOW confidence)
- None - all findings verified with official documentation or existing codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, Clerk patterns well-documented
- Architecture: HIGH - Patterns directly from Clerk docs and existing codebase
- Pitfalls: HIGH - Based on Clerk documentation and existing notification implementation
- Code examples: HIGH - Verified against Clerk SDK documentation and existing components

**Research date:** 2026-01-31
**Valid until:** 60 days (Clerk SDK stable, notification patterns established)

## Success Criteria Mapping

| Success Criterion | Implementation Approach | Confidence |
|------------------|------------------------|------------|
| 1. User can update name, email, phone | Clerk UserProfile component embedded in settings | HIGH |
| 2. User can upload/change profile photo | Clerk UserProfile component handles this automatically | HIGH |
| 3. User can opt in/out of notification types | PersonalNotificationSettings component using existing API | HIGH |
| 4. Notification preferences respected by system | Database model exists, service integration in future phase | MEDIUM* |

\* MEDIUM confidence on criterion 4 because notification service integration with user preferences is not part of Phase 11 scope - that would be a future enhancement to the notification sending logic.

## Notification Preference Hierarchy (Future Implementation)

For reference when implementing notification service logic (likely Phase 12):

```
Notification Decision Tree:
1. Check if notification type is critical/security-related
   → YES: Send regardless of preferences (security trumps all)
   → NO: Continue to step 2

2. Check organization notification preferences (Phase 9)
   → If org has disabled this notification type: STOP (don't send)
   → If org allows: Continue to step 3

3. Check user notification preferences (Phase 11)
   → If user has opted out: STOP (don't send)
   → If user allows: Continue to step 4

4. Check channel availability
   → Email: User has verified email? Send
   → SMS: User has valid phone number? Send
   → In-app: Always available

Final decision: Send notification via allowed channels
```

This hierarchy ensures:
- Organizations control what notifications exist
- Users control which they receive
- Critical notifications always go through
- Channel availability is validated
