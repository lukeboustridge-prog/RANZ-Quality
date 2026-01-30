# Phase 10: Staff Management - Research

**Researched:** 2026-01-31
**Domain:** Organization staff management, Clerk invitations, role-based access control
**Confidence:** HIGH

## Summary

Phase 10 implements staff management functionality allowing org admins to invite new team members via email, remove departed staff, and assign/change roles. This phase builds on existing infrastructure:

1. **Clerk Organizations** - Provides invitation system with email delivery built-in
2. **OrganizationMember Model** - Already exists with role enum (OWNER, ADMIN, STAFF)
3. **Settings Page** - Created in Phase 9 as container for admin-only features
4. **Email Infrastructure** - Resend already configured for transactional emails
5. **Role Checks** - Established pattern for OWNER/ADMIN authorization

The codebase already has `/api/staff/[id]` endpoints for GET, PUT (update), and DELETE operations. Phase 10 extends this with invitation creation, listing pending invitations, and role change workflows. Clerk handles the invitation email delivery and acceptance flow automatically.

**Primary recommendation:** Add Staff Management section to existing settings page, leveraging Clerk's Backend SDK for invitations (`createOrganizationInvitation`, `getOrganizationInvitationList`, `revokeOrganizationInvitation`) and existing database patterns for member management.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @clerk/nextjs | 6.36.x | Organization invitations | Built-in email delivery, invitation lifecycle management |
| Prisma | 6.x | Database ORM | Existing OrganizationMember model |
| Next.js 16 | 16.x | App Router pages | Server components for data fetching |
| Resend | Latest | Email service | Already configured, fallback for custom notifications |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.x | Form validation | API route validation (existing pattern) |
| Lucide React | Latest | Icons | UI components for staff table |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clerk invitations | Custom invite emails | Clerk provides invitation lifecycle, acceptance tracking, security - no reason to build custom |
| Clerk Backend SDK | REST API directly | SDK provides type safety, simpler code |

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── (dashboard)/
│       └── settings/
│           └── page.tsx              # Add staff management section
├── components/
│   └── settings/
│       ├── staff-invitation-form.tsx # Invite new member form
│       ├── staff-list.tsx            # List current members
│       ├── pending-invitations.tsx   # List/revoke pending invites
│       └── staff-role-selector.tsx   # Change member role
└── app/
    └── api/
        └── staff/
            ├── invite/
            │   └── route.ts          # POST - create invitation
            ├── invitations/
            │   └── route.ts          # GET - list pending, DELETE - revoke
            └── [id]/
                └── route.ts          # Existing: GET, PUT (update role), DELETE
```

### Pattern 1: Clerk Organization Invitation (Server-side)
**What:** Use Clerk Backend SDK to create organization invitations with email delivery
**When to use:** Inviting new staff members
**Example:**
```typescript
// Source: https://clerk.com/docs/references/backend/organization/create-organization-invitation
import { clerkClient } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { emailAddress, role } = await req.json();

  // Initialize Clerk client (v6 is async)
  const client = await clerkClient();

  // Create invitation - Clerk sends email automatically
  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    inviterUserId: userId,
    emailAddress,
    role, // "org:member" or "org:admin"
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
  });

  return NextResponse.json(invitation);
}
```

### Pattern 2: List Pending Invitations
**What:** Retrieve pending invitations for display in UI
**When to use:** Showing invitations awaiting acceptance
**Example:**
```typescript
// Source: https://clerk.com/docs/reference/backend/organization/get-organization-invitation-list
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();

  const { data, totalCount } = await client.organizations.getOrganizationInvitationList({
    organizationId: orgId,
    status: ['pending'], // Filter for pending only
    limit: 50,
  });

  return NextResponse.json({ invitations: data, total: totalCount });
}
```

### Pattern 3: Revoke Invitation
**What:** Cancel a pending invitation before acceptance
**When to use:** User accidentally invited wrong email or role changed
**Example:**
```typescript
// Source: https://clerk.com/docs/references/backend/organization/revoke-organization-invitation
export async function DELETE(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invitationId } = await req.json();

  const client = await clerkClient();

  const revokedInvitation = await client.organizations.revokeOrganizationInvitation({
    organizationId: orgId,
    invitationId,
    requestingUserId: userId,
  });

  return NextResponse.json(revokedInvitation);
}
```

### Pattern 4: Update Member Role (Existing Pattern Extended)
**What:** Change existing member's role between OWNER, ADMIN, STAFF
**When to use:** Promoting staff to admin or demoting admin to staff
**Example:**
```typescript
// Source: Existing src/app/api/staff/[id]/route.ts
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { role } = await req.json();

  // Validate role
  const updateSchema = z.object({
    role: z.enum(["OWNER", "ADMIN", "STAFF"]),
  });
  const data = updateSchema.parse({ role });

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const member = await db.organizationMember.update({
    where: {
      id,
      organizationId: organization.id, // Ensure member belongs to current org
    },
    data: { role: data.role },
  });

  // Update compliance score (existing pattern)
  await updateOrganizationComplianceScore(organization.id);
  revalidatePath('/settings');

  return NextResponse.json(member);
}
```

### Pattern 5: Clerk Invitation Acceptance (Handled Automatically)
**What:** When user clicks invitation link, Clerk redirects to `redirectUrl` with query params
**When to use:** Understanding the flow after invitation sent
**Example:**
```typescript
// User receives email with invitation link
// Clicks link -> Clerk processes
// Redirects to: https://portal.ranz.org.nz/onboarding?__clerk_ticket=abc123&__clerk_status=sign_in

// In onboarding page:
// __clerk_status values:
// - "sign_in": User already has account, just needs to accept invitation
// - "sign_up": User needs to create account first
// - "complete": Invitation already accepted

// Clerk automatically handles the authentication flow
// No custom code needed - Clerk Components handle ticket verification
```

### Anti-Patterns to Avoid
- **Mixing Clerk invitations with custom email invites:** Use Clerk exclusively for consistency
- **Not checking organization membership before role changes:** Always verify `orgId` matches
- **Allowing non-admin to invite:** Restrict invitation creation to OWNER/ADMIN roles
- **Not revoking invitations when member added manually:** Clean up pending invites if user added another way
- **Hardcoding role strings:** Use the `OrgMemberRole` enum from Prisma

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email invitation delivery | Custom SMTP + templates | Clerk's `createOrganizationInvitation` | Built-in email, retries, tracking, security |
| Invitation token generation | UUID + database | Clerk invitation IDs | Handles expiration, one-time use, security |
| Invitation acceptance flow | Custom verification | Clerk's `__clerk_ticket` system | Automatic sign-in/sign-up routing |
| Email template design | Custom HTML emails | Clerk's default templates | Professional, tested, mobile-responsive |
| Invitation expiration | Cron job to check dates | Clerk's built-in expiry | Automatic after 30 days (configurable) |
| Role permission checking | Custom middleware | Existing role check pattern | Already proven in codebase |

**Key insight:** Clerk Organizations provides a complete invitation lifecycle (create → send → accept → join). Building custom invitation logic duplicates functionality that's battle-tested and maintained by Clerk.

## Common Pitfalls

### Pitfall 1: Async clerkClient() in v6
**What goes wrong:** Calling `clerkClient.organizations.createOrganizationInvitation()` directly throws error
**Why it happens:** `@clerk/nextjs` v6 changed `clerkClient()` to async function
**How to avoid:** Always `const client = await clerkClient()` first, then call methods
**Warning signs:** TypeScript error "Property 'organizations' does not exist on type 'Promise'"

### Pitfall 2: Not Handling Clerk vs Database State Mismatch
**What goes wrong:** Member removed from database but still in Clerk organization
**Why it happens:** Deleting `OrganizationMember` record doesn't remove from Clerk
**How to avoid:** Phase 10 uses invitations only - member records created AFTER acceptance. If implementing removal, consider two-way sync.
**Warning signs:** User can still access org in Clerk but has no database record

### Pitfall 3: Inviting Existing Members
**What goes wrong:** Duplicate invitations or errors when email already member
**Why it happens:** Not checking if email already exists in organization
**How to avoid:** Query `OrganizationMember` by email before sending invitation
**Warning signs:** Clerk API returns error "Email already a member of organization"

### Pitfall 4: Wrong Role Format for Clerk
**What goes wrong:** Invitation creation fails with invalid role
**Why it happens:** Clerk uses `org:member`, `org:admin` format, not database `STAFF`, `ADMIN`
**How to avoid:** Map database roles to Clerk roles before calling API
**Warning signs:** Clerk API returns 400 error "Invalid role"

### Pitfall 5: Not Restricting Invitation Creation to Admins
**What goes wrong:** Any org member can invite new staff
**Why it happens:** Missing role check in API route
**How to avoid:** Use existing admin check pattern from settings page
**Warning signs:** STAFF role users can access invitation API

### Pitfall 6: Invitation Email Customization Expectations
**What goes wrong:** Users expect to customize email template but can't easily
**Why it happens:** Clerk provides default templates; customization requires dashboard config or enterprise plan
**How to avoid:** Document that invitation emails use Clerk's default design
**Warning signs:** User stories request custom email branding

## Code Examples

Verified patterns from official sources:

### Complete Invitation API Route
```typescript
// Source: Pattern from existing API routes + Clerk docs
// Location: src/app/api/staff/invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const inviteSchema = z.object({
  emailAddress: z.string().email(),
  role: z.enum(["ADMIN", "STAFF"]), // Database role format
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
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
    const data = inviteSchema.parse(body);

    // Check if email already exists
    const existingMember = await db.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        email: data.emailAddress,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "A member with this email already exists" },
        { status: 400 }
      );
    }

    // Map database role to Clerk role format
    const clerkRole = data.role === "ADMIN" ? "org:admin" : "org:member";

    // Create invitation via Clerk
    const client = await clerkClient();
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: data.emailAddress,
      role: clerkRole,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
      publicMetadata: {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role, // Store database role for later
      },
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        emailAddress: invitation.emailAddress,
        role: data.role,
        status: invitation.status,
        createdAt: invitation.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to create invitation:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Staff List Component with Role Change
```typescript
// Source: Pattern from existing components + Clerk docs
// Location: src/components/settings/staff-list.tsx
"use client";

import { useState } from "react";
import { Trash2, Shield, User } from "lucide-react";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "OWNER" | "ADMIN" | "STAFF";
  lbpNumber?: string | null;
}

interface StaffListProps {
  members: StaffMember[];
  currentUserId: string;
}

export function StaffList({ members, currentUserId }: StaffListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, newRole: string) {
    setLoading(memberId);
    try {
      const response = await fetch(`/api/staff/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }

      // Refresh page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Failed to update role:", error);
      alert(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setLoading(null);
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from the organization?`)) {
      return;
    }

    setLoading(memberId);
    try {
      const response = await fetch(`/api/staff/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove member");
      }

      // Refresh page
      window.location.reload();
    } catch (error) {
      console.error("Failed to remove member:", error);
      alert(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setLoading(null);
    }
  }

  function getRoleIcon(role: string) {
    if (role === "OWNER") return <Shield className="h-4 w-4 text-purple-600" />;
    if (role === "ADMIN") return <Shield className="h-4 w-4 text-blue-600" />;
    return <User className="h-4 w-4 text-gray-600" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              LBP Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {members.map((member) => {
            const isCurrentUser = member.id === currentUserId;
            const isOwner = member.role === "OWNER";
            const isLoading = loading === member.id;

            return (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getRoleIcon(member.role)}
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                      {isCurrentUser && <span className="ml-2 text-xs text-gray-500">(You)</span>}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.lbpNumber || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {!isCurrentUser && !isOwner ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      disabled={isLoading}
                      className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {!isCurrentUser && !isOwner && (
                    <button
                      onClick={() => handleRemoveMember(member.id, `${member.firstName} ${member.lastName}`)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

### Pending Invitations Component
```typescript
// Source: Clerk docs + existing component patterns
// Location: src/components/settings/pending-invitations.tsx
"use client";

import { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";

interface PendingInvitation {
  id: string;
  emailAddress: string;
  role: string;
  createdAt: number;
  status: string;
}

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  async function fetchInvitations() {
    try {
      const response = await fetch("/api/staff/invitations");
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(invitationId: string, email: string) {
    if (!confirm(`Revoke invitation to ${email}?`)) {
      return;
    }

    setRevoking(invitationId);
    try {
      const response = await fetch("/api/staff/invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke invitation");
      }

      // Remove from list
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      console.error("Failed to revoke invitation:", error);
      alert("Failed to revoke invitation");
    } finally {
      setRevoking(null);
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading pending invitations...</div>;
  }

  if (invitations.length === 0) {
    return (
      <div className="text-gray-500 text-sm italic">
        No pending invitations
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-yellow-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {invitation.emailAddress}
              </div>
              <div className="text-xs text-gray-500">
                Invited as {invitation.role} • {new Date(invitation.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleRevoke(invitation.id, invitation.emailAddress)}
            disabled={revoking === invitation.id}
            className="text-red-600 hover:text-red-800 disabled:opacity-50"
            title="Revoke invitation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual email invites + custom tokens | Clerk organization invitations | Clerk v5+ | Automatic email delivery, security, tracking |
| Sync clerkClient() | Async clerkClient() | @clerk/nextjs v6 (2024) | Must await client initialization |
| Custom role strings | Clerk role format (org:member) | Clerk Organizations feature | Must map between database and Clerk roles |
| Direct backend API calls | JS Backend SDK wrapper | Ongoing | Type safety, simpler code |

**Deprecated/outdated:**
- Sync `clerkClient()` usage - v6 requires `await clerkClient()`
- Client-side invitation creation - server-side recommended for redirect URL control
- Custom invitation email templates without dashboard config - Clerk provides defaults

## Open Questions

Things that couldn't be fully resolved:

1. **Clerk vs Database Member Sync**
   - What we know: Invitations create Clerk org members; database records created separately
   - What's unclear: Should removing database record also remove from Clerk org?
   - Recommendation: For Phase 10, focus on invitation flow. Handle removal by just deleting database record - user stays in Clerk org but loses app access (safe approach).

2. **Role Mapping Between Systems**
   - What we know: Database has OWNER/ADMIN/STAFF, Clerk has org:owner/org:admin/org:member
   - What's unclear: Should we sync roles bidirectionally or keep database as source of truth?
   - Recommendation: Database is source of truth. Map to Clerk roles only for invitations. Clerk roles not used for authorization.

3. **Invitation Email Customization**
   - What we know: Clerk provides default templates, customization requires dashboard config
   - What's unclear: Can we programmatically customize per-invitation?
   - Recommendation: Accept Clerk defaults for MVP. Document that custom branding requires Clerk dashboard configuration.

4. **Post-Acceptance Member Creation**
   - What we know: Clerk creates organization membership when invitation accepted
   - What's unclear: How to detect acceptance and create database `OrganizationMember` record?
   - Recommendation: Implement Clerk webhook for `organizationMembership.created` event to auto-create database record (may be Phase 11).

## Sources

### Primary (HIGH confidence)
- [Clerk Organization Invitations Guide](https://clerk.com/docs/guides/organizations/add-members/invitations) - Organization invitation overview
- [Clerk createOrganizationInvitation() SDK Reference](https://clerk.com/docs/references/backend/organization/create-organization-invitation) - Function signature and parameters
- [Clerk getOrganizationInvitationList() SDK Reference](https://clerk.com/docs/reference/backend/organization/get-organization-invitation-list) - List invitations API
- [Clerk revokeOrganizationInvitation() SDK Reference](https://clerk.com/docs/references/backend/organization/revoke-organization-invitation) - Revoke invitation API
- [Clerk Next.js SDK Reference](https://clerk.com/docs/reference/nextjs/overview) - clerkClient import for v6
- Codebase analysis: `src/app/api/staff/[id]/route.ts` - Existing member management endpoints
- Codebase analysis: `src/app/(dashboard)/settings/page.tsx` - Settings page structure from Phase 9
- Codebase analysis: `prisma/schema.prisma` - OrganizationMember model, OrgMemberRole enum
- Codebase analysis: `src/lib/email.ts` - Resend email infrastructure

### Secondary (MEDIUM confidence)
- [Clerk Organization Invitation Methods (JavaScript)](https://clerk.com/docs/references/javascript/organization/invitations) - Client-side methods
- [Clerk Backend SDK Upgrade Guide (v6)](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/nextjs-v6) - Async clerkClient changes
- Web search: Multiple sources confirming Clerk invitation workflow and best practices

### Tertiary (LOW confidence)
- None - all findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Clerk SDK already in use, all patterns documented
- Architecture: HIGH - Patterns directly from Clerk docs and existing codebase
- Pitfalls: HIGH - Based on v6 migration notes and role mapping requirements
- Code examples: HIGH - Verified against official Clerk SDK documentation

**Research date:** 2026-01-31
**Valid until:** 60 days (Clerk SDK stable, no major version changes expected)

## Role Mapping Reference

Quick reference for mapping between database and Clerk role formats:

| Database Role | Clerk Role Format | Permission Level |
|--------------|------------------|------------------|
| OWNER | org:owner | Full control, cannot be removed |
| ADMIN | org:admin | Manage members, documents, settings |
| STAFF | org:member | View and upload documents only |

**Note:** Database roles are source of truth for authorization in API routes. Clerk roles used only for invitation creation.
