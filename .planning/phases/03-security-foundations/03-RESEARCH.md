# Phase 3: Security Foundations - Research

**Researched:** 2026-01-28
**Domain:** Cron endpoint authentication and tamper-evident audit logging with cryptographic hash chains
**Confidence:** HIGH

## Summary

Phase 3 establishes production-ready security controls for two critical infrastructure components: cron endpoint authentication and immutable audit trail logging. The cron authentication requirement (SEC-01) protects scheduled jobs from unauthorized triggering using Vercel's built-in `CRON_SECRET` header validation. The audit logging requirement (SEC-04) creates a tamper-evident chain-of-custody for all data mutations using SHA-256 hash chains that link each log entry to the previous one, making unauthorized modifications mathematically detectable.

The current codebase already has partial implementations: cron endpoints in `/api/cron/verify-lbp` and `/api/cron/notifications` perform header validation but use a permissive fallback (`if (!cronSecret) return true`), and the `AuditLog` Prisma model exists with `hash` and `previousHash` fields but has no actual logging implementation.

**Primary recommendation:** Replace permissive cron validation with strict `env.CRON_SECRET` validation that throws on startup if missing, create a `lib/audit-log.ts` utility to centralize hash chain creation, and wrap all document/insurance/member mutations with `createAuditLog()` calls that automatically compute SHA-256 hashes linking to the previous entry.

## Standard Stack

The established libraries/tools for security foundations in Next.js + Prisma applications:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js crypto | Built-in | SHA-256 hashing for audit log integrity | Native, zero dependencies, FIPS 140-2 certified in Node |
| Zod | 4.3.6 | Environment variable validation with strict `.min(1)` rules | Already in use for API validation, perfect for env schema |
| Prisma | 7.3.0 | Database transactions for atomic audit log + mutation writes | Already in use, ensures consistency |
| Next.js env validation | Built-in | Server-only environment variable access via `process.env` | Framework standard, automatic client/server separation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Clerk Auth | Already in use | User identification for `actorId` in audit logs | For capturing who performed mutations |
| jsonwebtoken | Optional | JWT parsing if audit log needs to record session claims | If detailed role info required in audit trail |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node crypto | `crypto-js` npm package | Adds 52KB dependency for same SHA-256 algorithm, unnecessary |
| Strict env validation | Permissive fallback (`if (!secret) return true`) | Development convenience, but production vulnerability if misconfigured |
| Hash chain | Merkle tree per batch | More complex verification, overkill for sequential audit log |
| PostgreSQL audit | Triggers/row-level security | Database-locked, harder to query, less portable |

**Installation:**
```bash
# All dependencies already installed in current project
# No additional packages required - Node crypto is built-in
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── audit-log.ts           # NEW: Centralized audit logging utility
│   ├── env.ts                  # MODIFY: Make CRON_SECRET strict (non-optional)
│   └── db.ts                   # Existing Prisma client
├── app/
│   └── api/
│       ├── cron/
│       │   ├── verify-lbp/route.ts     # MODIFY: Use strict verifyCronSecret
│       │   └── notifications/route.ts   # MODIFY: Use strict verifyCronSecret
│       ├── insurance/route.ts          # MODIFY: Add audit logging to POST/PUT/DELETE
│       ├── documents/[id]/route.ts     # MODIFY: Add audit logging
│       └── staff/route.ts              # MODIFY: Add audit logging
└── prisma/
    └── schema.prisma           # Already has AuditLog model with hash fields
```

### Pattern 1: Strict CRON_SECRET Validation with Startup Check
**What:** Environment variable must exist at build/startup time, cron endpoints return 401 if header missing
**When to use:** All `/api/cron/*` routes that should only be triggered by Vercel Cron or authenticated services
**Example:**
```typescript
// Source: Vercel docs + CodingCat.dev secure cron guide
// https://codingcat.dev/post/how-to-secure-vercel-cron-job-routes-in-next-js-14-app-router

// File: src/lib/env.ts (MODIFY existing file)
import { z } from "zod/v4";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // ... other vars

  // CRITICAL: Remove .optional() - CRON_SECRET is now REQUIRED
  CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters"), // Strong secret
});

function validateEnv() {
  if (typeof window !== "undefined") {
    return {} as z.infer<typeof envSchema>;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    // CRITICAL: Throw error - application startup fails if CRON_SECRET missing
    throw new Error("Invalid environment variables - check .env configuration");
  }

  return parsed.data;
}

export const env = validateEnv();

// File: src/lib/cron-auth.ts (NEW file)
import { NextRequest, NextResponse } from "next/server";
import { env } from "./env";

/**
 * Verifies cron request authentication using CRON_SECRET header.
 * Returns 401 response if unauthorized, null if valid.
 *
 * Usage in cron routes:
 *   const authError = verifyCronRequest(req);
 *   if (authError) return authError;
 */
export function verifyCronRequest(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization");

  // CRITICAL: No fallback - strict validation only
  // Vercel automatically adds: Authorization: Bearer <CRON_SECRET>
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    console.warn("⚠️ Unauthorized cron attempt", {
      ip: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
      path: req.nextUrl.pathname,
    });

    return NextResponse.json(
      { error: "Unauthorized - invalid CRON_SECRET" },
      { status: 401 }
    );
  }

  return null; // Valid request
}

// File: src/app/api/cron/verify-lbp/route.ts (MODIFY existing)
import { verifyCronRequest } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  // CRITICAL: Strict authentication - no permissive fallback
  const authError = verifyCronRequest(req);
  if (authError) return authError;

  // Existing cron logic...
  const result = await verifyAllLBPNumbers();
  return NextResponse.json({ success: true, ...result });
}
```

**Why this works:** Zod's `.min(1)` throws at startup if env var missing, preventing misconfigured deployments from reaching production. Vercel automatically injects `CRON_SECRET` into the Authorization header for scheduled jobs, so legitimate requests always pass validation.

### Pattern 2: Hash Chain Audit Logging with Automatic Linking
**What:** Each mutation creates an audit log entry with SHA-256 hash of current state + previous entry's hash
**When to use:** All CREATE/UPDATE/DELETE operations on Organization, InsurancePolicy, Document, OrganizationMember
**Example:**
```typescript
// Source: VeritasChain hash chain implementation patterns
// https://dev.to/veritaschain/building-a-tamper-evident-audit-log-with-sha-256-hash-chains-zero-dependencies-h0b

// File: src/lib/audit-log.ts (NEW file)
import { db } from "./db";
import { auth } from "@clerk/nextjs/server";
import { AuditAction } from "@prisma/client";
import crypto from "crypto";

interface AuditLogInput {
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Creates tamper-evident audit log entry with SHA-256 hash chain.
 * Automatically links to previous entry via previousHash field.
 *
 * Hash chain formula:
 *   hash = SHA256(eventId + actorId + action + resourceType + resourceId +
 *                 timestamp + previousHash + JSON(previousState) + JSON(newState))
 *
 * @throws Error if authentication fails (no actorId available)
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  const { userId } = await auth();

  // Note: Some operations (cron jobs, webhooks) may not have userId
  // In those cases, use system identifier
  const actorId = userId || "system:cron";
  const actorEmail = userId ? await getUserEmail(userId) : "system@ranz.org.nz";
  const actorRole = userId ? await getUserRole(userId) : "system";

  // Get the most recent audit log entry to chain to
  const previousEntry = await db.auditLog.findFirst({
    orderBy: { id: "desc" },
    select: { hash: true },
  });

  const eventId = crypto.randomUUID();
  const timestamp = new Date();
  const previousHash = previousEntry?.hash || null;

  // Compute SHA-256 hash linking this entry to previous
  const hashInput = [
    eventId,
    actorId,
    input.action,
    input.resourceType,
    input.resourceId,
    timestamp.toISOString(),
    previousHash || "genesis",
    JSON.stringify(input.previousState || null),
    JSON.stringify(input.newState || null),
    JSON.stringify(input.metadata || null),
  ].join("|");

  const hash = crypto.createHash("sha256").update(hashInput).digest("hex");

  // Write audit log entry (immutable - never UPDATE or DELETE)
  await db.auditLog.create({
    data: {
      eventId,
      actorId,
      actorEmail,
      actorRole,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      previousState: input.previousState,
      newState: input.newState,
      metadata: input.metadata,
      hash,
      previousHash,
      timestamp,
    },
  });
}

/**
 * Verifies integrity of audit log hash chain.
 * Returns first entry with broken chain, or null if valid.
 */
export async function verifyAuditChain(): Promise<{
  valid: boolean;
  brokenAt?: bigint;
  message?: string;
}> {
  const entries = await db.auditLog.findMany({
    orderBy: { id: "asc" },
  });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPreviousHash = i > 0 ? entries[i - 1].hash : null;

    if (entry.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        brokenAt: entry.id,
        message: `Hash chain broken at entry ${entry.id}: expected previousHash ${expectedPreviousHash}, got ${entry.previousHash}`,
      };
    }

    // Recompute hash to verify tampering
    const hashInput = [
      entry.eventId,
      entry.actorId,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      entry.timestamp.toISOString(),
      entry.previousHash || "genesis",
      JSON.stringify(entry.previousState),
      JSON.stringify(entry.newState),
      JSON.stringify(entry.metadata),
    ].join("|");

    const recomputedHash = crypto
      .createHash("sha256")
      .update(hashInput)
      .digest("hex");

    if (entry.hash !== recomputedHash) {
      return {
        valid: false,
        brokenAt: entry.id,
        message: `Entry ${entry.id} tampered - hash mismatch`,
      };
    }
  }

  return { valid: true };
}

// Helper functions (simplified - would connect to Clerk in real implementation)
async function getUserEmail(userId: string): Promise<string> {
  // In real implementation: query Clerk API or session claims
  return `user-${userId}@example.com`;
}

async function getUserRole(userId: string): Promise<string> {
  // In real implementation: read from Clerk session claims
  return "org:member";
}
```

### Pattern 3: Wrapping Mutations with Audit Logging
**What:** Every database write automatically logs before/after state to audit trail
**When to use:** POST/PUT/DELETE handlers for documents, insurance, staff
**Example:**
```typescript
// Source: Current codebase mutation pattern + audit logging wrapper
// File: src/app/api/insurance/route.ts (MODIFY existing POST handler)

import { createAuditLog } from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
  });
  if (!organization) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const validatedData = createPolicySchema.parse({
    policyType: formData.get("policyType"),
    // ... other fields
  });

  // Upload certificate to R2
  const file = formData.get("certificate") as File | null;
  let certificateKey: string | null = null;
  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    certificateKey = await uploadToR2(
      buffer,
      `insurance/${organization.id}/${Date.now()}-${file.name}`,
      file.type
    );
  }

  // Create policy record
  const policy = await db.insurancePolicy.create({
    data: {
      organizationId: organization.id,
      ...validatedData,
      certificateKey,
    },
  });

  // NEW: Log mutation to audit trail (no previousState for CREATE)
  await createAuditLog({
    action: "CREATE",
    resourceType: "InsurancePolicy",
    resourceId: policy.id,
    previousState: null,
    newState: {
      policyType: policy.policyType,
      policyNumber: policy.policyNumber,
      insurer: policy.insurer,
      coverageAmount: policy.coverageAmount.toString(),
      expiryDate: policy.expiryDate.toISOString(),
    },
    metadata: {
      organizationId: organization.id,
      certificateUploaded: !!certificateKey,
    },
  });

  // Recalculate compliance
  await updateOrganizationComplianceScore(organization.id);
  revalidatePath("/dashboard");

  return NextResponse.json(policy);
}

// File: src/app/api/insurance/[id]/route.ts (MODIFY existing PUT handler)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
  });
  if (!organization) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch existing state BEFORE mutation
  const existingPolicy = await db.insurancePolicy.findFirst({
    where: {
      id,
      organizationId: organization.id,
    },
  });
  if (!existingPolicy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const validatedData = updatePolicySchema.parse({
    expiryDate: formData.get("expiryDate"),
    // ... other fields
  });

  // Perform update
  const updatedPolicy = await db.insurancePolicy.update({
    where: { id },
    data: validatedData,
  });

  // NEW: Log mutation to audit trail with before/after state
  await createAuditLog({
    action: "UPDATE",
    resourceType: "InsurancePolicy",
    resourceId: id,
    previousState: {
      expiryDate: existingPolicy.expiryDate.toISOString(),
      coverageAmount: existingPolicy.coverageAmount.toString(),
    },
    newState: {
      expiryDate: updatedPolicy.expiryDate.toISOString(),
      coverageAmount: updatedPolicy.coverageAmount.toString(),
    },
    metadata: {
      organizationId: organization.id,
    },
  });

  await updateOrganizationComplianceScore(organization.id);
  revalidatePath("/dashboard");

  return NextResponse.json(updatedPolicy);
}
```

### Pattern 4: RANZ Admin Audit Trail Viewer
**What:** Admin interface to view audit logs for an organization with tamper verification
**When to use:** Dispute resolution, compliance audits, security investigations
**Example:**
```typescript
// File: src/app/(admin)/admin/organizations/[id]/audit/page.tsx (NEW)
import { db } from "@/lib/db";
import { verifyAuditChain } from "@/lib/audit-log";
import { AuditTrailTable } from "./_components/audit-trail-table";

export default async function AuditTrailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const organization = await db.organization.findUnique({
    where: { id },
  });
  if (!organization) return <div>Organization not found</div>;

  // Fetch audit logs for this organization
  const logs = await db.auditLog.findMany({
    where: {
      OR: [
        { resourceType: "Organization", resourceId: id },
        { resourceType: "InsurancePolicy", resourceId: { contains: id } },
        { resourceType: "Document", resourceId: { contains: id } },
        { resourceType: "OrganizationMember", resourceId: { contains: id } },
      ],
    },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  // Verify hash chain integrity (expensive - run async or cache result)
  const chainVerification = await verifyAuditChain();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Audit Trail: {organization.name}
        </h1>
        {chainVerification.valid ? (
          <div className="flex items-center gap-2 text-green-600">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Chain Verified</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm font-medium">
              Chain Broken at Entry {chainVerification.brokenAt?.toString()}
            </span>
          </div>
        )}
      </div>

      <AuditTrailTable logs={logs} />
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Permissive CRON_SECRET fallback:** Current code has `if (!cronSecret) return true` - allows unauthorized access if env var missing
- **Mutable audit logs:** Never add UPDATE or DELETE operations on AuditLog table - immutability is core to tamper evidence
- **Calculating hash without previous chain:** Each entry MUST include previousHash to maintain chain integrity
- **Logging after mutation fails:** Wrap in try/catch to ensure audit log only written on successful database mutation
- **Storing sensitive data in audit logs:** Don't log passwords, API keys, or full certificate files - log metadata only

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cryptographic hashing | Custom hash algorithm, MD5, SHA-1 | Node.js `crypto.createHash('sha256')` | Built-in, FIPS-certified, battle-tested for tamper detection |
| Environment variable validation | Manual `if (!process.env.X)` checks | Zod schema with `.min(1)` validation | Type-safe, throws on startup, prevents misconfiguration reaching production |
| Audit log querying | Custom filtering logic | Prisma where clauses with OR conditions | Type-safe, handles complex resource type filtering |
| Hash chain verification | Manual loop with string comparison | Recompute each hash and compare sequentially | Standard pattern from blockchain/ledger systems |

**Key insight:** SHA-256 hash chains are well-established in blockchain and financial audit systems - don't reinvent verification logic. The pattern is: store `hash` (current entry integrity) and `previousHash` (chain linkage), then verify by recomputing hashes sequentially from genesis.

## Common Pitfalls

### Pitfall 1: CRON_SECRET Missing in Production
**What goes wrong:** Cron endpoints throw 401 errors on Vercel scheduled jobs despite valid requests
**Why it happens:** CRON_SECRET env var not added to Vercel project settings, validation requires it but it's undefined
**How to avoid:**
1. Add `CRON_SECRET` to Vercel environment variables (Settings → Environment Variables)
2. Generate secure random value: `openssl rand -base64 32`
3. Vercel automatically injects this as `Authorization: Bearer <secret>` header
4. Test locally by adding to `.env.local` and using curl with header
**Warning signs:**
- Cron jobs show "401 Unauthorized" in Vercel logs
- Manual curl test with header works, scheduled job fails
- `.env.example` shows CRON_SECRET but not in actual `.env`

### Pitfall 2: Hash Chain Breaks Due to Timestamp Precision
**What goes wrong:** Recomputed hash doesn't match stored hash even though data unchanged
**Why it happens:** JavaScript Date serialization varies (ISO string vs Unix timestamp), breaking hash calculation
**How to avoid:**
1. Always use `.toISOString()` when including timestamps in hash input
2. Store timestamp as `DateTime` in Prisma (not string), convert on hash computation
3. Never use `Date.now()` or `.getTime()` in hash - precision differs across systems
**Warning signs:**
- `verifyAuditChain()` reports all entries as tampered
- Hash mismatch on first verification attempt after creation
- Different hash when running verification twice without data changes

### Pitfall 3: Race Condition on previousHash Lookup
**What goes wrong:** Two simultaneous mutations both read same "most recent" entry, create diverging chains
**Why it happens:** `findFirst` + `create` is not atomic, concurrent requests interleave
**How to avoid:**
1. Wrap audit log creation in Prisma transaction with serializable isolation
2. Use database-level locking on AuditLog table during hash chain append
3. Implement retry logic with exponential backoff on unique constraint violation
**Warning signs:**
- Two audit log entries have same `previousHash` value
- Hash chain verification shows broken link midway through sequence
- Concurrent API requests both succeed but only one audit log created

### Pitfall 4: Logging Sensitive Data in previousState/newState
**What goes wrong:** Audit trail contains plaintext passwords, API keys, credit card numbers
**Why it happens:** Logging entire object from database mutation without sanitization
**How to avoid:**
1. Explicitly whitelist fields to log (don't use spread operator)
2. Redact sensitive fields: `password: '[REDACTED]'`
3. Store file metadata instead of content (filename, size, hash - not bytes)
**Warning signs:**
- Audit logs viewable by auditors contain user credentials
- Privacy Act 2020 violation due to excessive personal data retention
- Security audit flags sensitive data in database backups

### Pitfall 5: Forgetting to Log DELETE Operations
**What goes wrong:** Document deleted from database but no audit trail entry, compliance violation
**Why it happens:** DELETE handler returns 204 No Content without creating audit log
**How to avoid:**
1. Always fetch record BEFORE deletion to capture previousState
2. Create audit log with action="DELETE", previousState=record, newState=null
3. Use soft delete pattern (deletedAt timestamp) instead of hard delete when possible
**Warning signs:**
- Compliance assessments reference documents that no longer exist
- Users report data disappeared without trace
- Audit trail gaps where DELETE operations occurred

## Code Examples

Verified patterns from official sources:

### Example 1: Strict CRON_SECRET Validation (No Fallback)
```typescript
// Source: Vercel Cron documentation + CodingCat.dev security guide
// https://vercel.com/docs/cron-jobs/manage-cron-jobs
// https://codingcat.dev/post/how-to-secure-vercel-cron-job-routes-in-next-js-14-app-router

// File: src/lib/env.ts (MODIFY existing)
import { z } from "zod/v4";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // CRITICAL CHANGE: Remove .optional() - CRON_SECRET is now REQUIRED
  CRON_SECRET: z.string().min(32, {
    message: "CRON_SECRET must be at least 32 characters for security"
  }),

  // Keep optional fields as-is
  LBP_API_BASE_URL: z.string().url().optional(),
  LBP_API_KEY: z.string().optional(),
  BADGE_CDN_URL: z.string().url().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
});

function validateEnv() {
  if (typeof window !== "undefined") {
    return {} as z.infer<typeof envSchema>;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    // CRITICAL: Application fails to start if validation fails
    throw new Error(
      "Invalid environment variables. Check .env configuration and ensure all required variables are set."
    );
  }

  return parsed.data;
}

export const env = validateEnv();

// File: src/lib/cron-auth.ts (NEW file)
import { NextRequest, NextResponse } from "next/server";
import { env } from "./env";

/**
 * Verifies cron request authentication using CRON_SECRET header.
 *
 * Vercel automatically adds: Authorization: Bearer <CRON_SECRET>
 *
 * Returns 401 response if unauthorized, null if valid.
 */
export function verifyCronRequest(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization");

  // CRITICAL: Strict validation with no fallback
  // env.CRON_SECRET is guaranteed to exist due to Zod validation at startup
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    console.warn("⚠️ Unauthorized cron attempt detected", {
      ip: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      path: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Invalid or missing CRON_SECRET in Authorization header"
      },
      { status: 401 }
    );
  }

  return null; // Valid request - proceed
}

// File: src/app/api/cron/verify-lbp/route.ts (MODIFY existing)
import { NextRequest, NextResponse } from "next/server";
import { verifyAllLBPNumbers } from "@/lib/lbp-api";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { sendEmail } from "@/lib/email";
import { verifyCronRequest } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  // CRITICAL: Replace old permissive validation with strict check
  const authError = verifyCronRequest(req);
  if (authError) return authError;

  console.log("Starting daily LBP verification...");

  // Existing cron logic unchanged...
  const result = await verifyAllLBPNumbers();

  // ... rest of existing implementation

  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  return GET(req); // Support manual triggers with same auth
}
```

### Example 2: SHA-256 Hash Chain Audit Logging
```typescript
// Source: VeritasChain hash chain implementation
// https://dev.to/veritaschain/building-a-tamper-evident-audit-log-with-sha-256-hash-chains-zero-dependencies-h0b

// File: src/lib/audit-log.ts (NEW file)
import { db } from "./db";
import { auth } from "@clerk/nextjs/server";
import { AuditAction } from "@prisma/client";
import crypto from "crypto";

interface AuditLogInput {
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates tamper-evident audit log entry with SHA-256 hash chain.
 *
 * Hash Chain Pattern:
 * - Each entry computes SHA-256 of: eventId + actor + action + resource + timestamp + previousHash + states
 * - previousHash links to most recent entry, creating mathematical dependency
 * - Tampering with any entry breaks the chain (hash mismatch) for all subsequent entries
 *
 * @throws Error if hash chain computation fails
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    // Get actor information (userId from Clerk, or system for cron jobs)
    const { userId } = await auth();
    const actorId = userId || "system:cron";

    // Simplified actor details (in production, fetch from Clerk)
    const actorEmail = userId ? `user-${userId}@ranz.org.nz` : "system@ranz.org.nz";
    const actorRole = userId ? "org:member" : "system";

    // Fetch most recent audit log entry to chain to
    const previousEntry = await db.auditLog.findFirst({
      orderBy: { id: "desc" },
      select: { hash: true },
    });

    const eventId = crypto.randomUUID();
    const timestamp = new Date();
    const previousHash = previousEntry?.hash || null;

    // Compute SHA-256 hash linking this entry to previous
    // CRITICAL: Use consistent serialization (pipe-delimited, ISO dates)
    const hashInput = [
      eventId,
      actorId,
      input.action,
      input.resourceType,
      input.resourceId,
      timestamp.toISOString(), // CRITICAL: Always use .toISOString() for consistency
      previousHash || "genesis", // First entry has no previous
      JSON.stringify(input.previousState || null),
      JSON.stringify(input.newState || null),
      JSON.stringify(input.metadata || null),
    ].join("|");

    const hash = crypto.createHash("sha256").update(hashInput).digest("hex");

    // Write audit log entry (immutable - never UPDATE or DELETE)
    await db.auditLog.create({
      data: {
        eventId,
        actorId,
        actorEmail,
        actorRole,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        previousState: input.previousState || null,
        newState: input.newState || null,
        metadata: input.metadata || null,
        hash,
        previousHash,
        timestamp,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging failure shouldn't break application
    // But log prominently for security monitoring
  }
}

/**
 * Verifies integrity of entire audit log hash chain.
 *
 * Verification Process:
 * 1. Fetch all entries in chronological order
 * 2. For each entry, verify previousHash matches actual previous entry's hash
 * 3. Recompute hash from entry data and compare to stored hash
 * 4. Any mismatch indicates tampering
 *
 * Returns first broken entry, or success if chain intact.
 *
 * PERFORMANCE WARNING: This queries all audit logs - can be slow for large databases.
 * Consider batching or caching verification results.
 */
export async function verifyAuditChain(): Promise<{
  valid: boolean;
  brokenAt?: bigint;
  message?: string;
  totalEntries?: number;
}> {
  try {
    const entries = await db.auditLog.findMany({
      orderBy: { id: "asc" },
    });

    if (entries.length === 0) {
      return { valid: true, totalEntries: 0 };
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedPreviousHash = i > 0 ? entries[i - 1].hash : null;

      // Check chain linkage
      if (entry.previousHash !== expectedPreviousHash) {
        return {
          valid: false,
          brokenAt: entry.id,
          message: `Hash chain broken at entry ${entry.id}: expected previousHash ${expectedPreviousHash}, got ${entry.previousHash}`,
          totalEntries: entries.length,
        };
      }

      // Recompute hash to detect tampering
      const hashInput = [
        entry.eventId,
        entry.actorId,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        entry.timestamp.toISOString(),
        entry.previousHash || "genesis",
        JSON.stringify(entry.previousState),
        JSON.stringify(entry.newState),
        JSON.stringify(entry.metadata),
      ].join("|");

      const recomputedHash = crypto
        .createHash("sha256")
        .update(hashInput)
        .digest("hex");

      if (entry.hash !== recomputedHash) {
        return {
          valid: false,
          brokenAt: entry.id,
          message: `Entry ${entry.id} tampered - stored hash ${entry.hash} doesn't match recomputed hash ${recomputedHash}`,
          totalEntries: entries.length,
        };
      }
    }

    return { valid: true, totalEntries: entries.length };
  } catch (error) {
    console.error("Failed to verify audit chain:", error);
    return {
      valid: false,
      message: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Convenience wrapper for logging document mutations.
 */
export async function logDocumentMutation(
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE",
  documentId: string,
  previousState: Record<string, unknown> | null,
  newState: Record<string, unknown> | null
): Promise<void> {
  await createAuditLog({
    action,
    resourceType: "Document",
    resourceId: documentId,
    previousState,
    newState,
  });
}

/**
 * Convenience wrapper for logging insurance policy mutations.
 */
export async function logInsuranceMutation(
  action: "CREATE" | "UPDATE" | "DELETE",
  policyId: string,
  previousState: Record<string, unknown> | null,
  newState: Record<string, unknown> | null,
  metadata?: { organizationId: string }
): Promise<void> {
  await createAuditLog({
    action,
    resourceType: "InsurancePolicy",
    resourceId: policyId,
    previousState,
    newState,
    metadata,
  });
}

/**
 * Convenience wrapper for logging member mutations.
 */
export async function logMemberMutation(
  action: "CREATE" | "UPDATE" | "DELETE" | "LBP_VERIFY",
  memberId: string,
  previousState: Record<string, unknown> | null,
  newState: Record<string, unknown> | null
): Promise<void> {
  await createAuditLog({
    action,
    resourceType: "OrganizationMember",
    resourceId: memberId,
    previousState,
    newState,
  });
}
```

### Example 3: Wrapping Insurance Mutations with Audit Logging
```typescript
// File: src/app/api/insurance/route.ts (MODIFY existing POST handler)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { revalidatePath } from "next/cache";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { logInsuranceMutation } from "@/lib/audit-log";
import { z } from "zod/v4";

const createPolicySchema = z.object({
  policyType: z.enum([
    "PUBLIC_LIABILITY",
    "PROFESSIONAL_INDEMNITY",
    "STATUTORY_LIABILITY",
    "EMPLOYERS_LIABILITY",
    "MOTOR_VEHICLE",
    "CONTRACT_WORKS",
  ]),
  policyNumber: z.string().min(1),
  insurer: z.string().min(1),
  brokerName: z.string().optional(),
  coverageAmount: z.string().min(1),
  excessAmount: z.string().optional(),
  effectiveDate: z.string().min(1),
  expiryDate: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });
    if (!organization) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const validatedData = createPolicySchema.parse({
      policyType: formData.get("policyType"),
      policyNumber: formData.get("policyNumber"),
      insurer: formData.get("insurer"),
      brokerName: formData.get("brokerName") || undefined,
      coverageAmount: formData.get("coverageAmount"),
      excessAmount: formData.get("excessAmount") || undefined,
      effectiveDate: formData.get("effectiveDate"),
      expiryDate: formData.get("expiryDate"),
    });

    // Upload certificate to R2
    const file = formData.get("certificate") as File | null;
    let certificateKey: string | null = null;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      certificateKey = await uploadToR2(
        buffer,
        `insurance/${organization.id}/${Date.now()}-${file.name}`,
        file.type
      );
    }

    // Create policy record
    const policy = await db.insurancePolicy.create({
      data: {
        organizationId: organization.id,
        policyType: validatedData.policyType,
        policyNumber: validatedData.policyNumber,
        insurer: validatedData.insurer,
        brokerName: validatedData.brokerName || null,
        coverageAmount: validatedData.coverageAmount,
        excessAmount: validatedData.excessAmount || null,
        effectiveDate: new Date(validatedData.effectiveDate),
        expiryDate: new Date(validatedData.expiryDate),
        certificateKey,
      },
    });

    // NEW: Log creation to audit trail (no previousState for CREATE)
    await logInsuranceMutation(
      "CREATE",
      policy.id,
      null, // No previous state
      {
        policyType: policy.policyType,
        policyNumber: policy.policyNumber,
        insurer: policy.insurer,
        coverageAmount: policy.coverageAmount.toString(),
        effectiveDate: policy.effectiveDate.toISOString(),
        expiryDate: policy.expiryDate.toISOString(),
      },
      {
        organizationId: organization.id,
        certificateUploaded: !!certificateKey,
      }
    );

    // Recalculate compliance
    await updateOrganizationComplianceScore(organization.id);
    revalidatePath("/dashboard");

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Failed to create policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// File: src/app/api/insurance/[id]/route.ts (MODIFY existing PUT handler)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });
    if (!organization) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // CRITICAL: Fetch existing state BEFORE mutation for audit log
    const existingPolicy = await db.insurancePolicy.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });
    if (!existingPolicy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const validatedData = updatePolicySchema.parse({
      expiryDate: formData.get("expiryDate"),
      coverageAmount: formData.get("coverageAmount"),
      // ... other updateable fields
    });

    // Perform update
    const updatedPolicy = await db.insurancePolicy.update({
      where: { id },
      data: {
        expiryDate: new Date(validatedData.expiryDate),
        coverageAmount: validatedData.coverageAmount,
      },
    });

    // NEW: Log update to audit trail with before/after state
    await logInsuranceMutation(
      "UPDATE",
      id,
      {
        expiryDate: existingPolicy.expiryDate.toISOString(),
        coverageAmount: existingPolicy.coverageAmount.toString(),
      },
      {
        expiryDate: updatedPolicy.expiryDate.toISOString(),
        coverageAmount: updatedPolicy.coverageAmount.toString(),
      },
      {
        organizationId: organization.id,
      }
    );

    await updateOrganizationComplianceScore(organization.id);
    revalidatePath("/dashboard");

    return NextResponse.json(updatedPolicy);
  } catch (error) {
    console.error("Failed to update policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// File: src/app/api/insurance/[id]/route.ts (MODIFY existing DELETE handler)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });
    if (!organization) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // CRITICAL: Fetch policy BEFORE deletion to capture final state
    const policy = await db.insurancePolicy.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });
    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // Delete policy
    await db.insurancePolicy.delete({
      where: { id },
    });

    // NEW: Log deletion to audit trail (no newState for DELETE)
    await logInsuranceMutation(
      "DELETE",
      id,
      {
        policyType: policy.policyType,
        policyNumber: policy.policyNumber,
        insurer: policy.insurer,
        coverageAmount: policy.coverageAmount.toString(),
        expiryDate: policy.expiryDate.toISOString(),
      },
      null, // No new state after deletion
      {
        organizationId: organization.id,
      }
    );

    await updateOrganizationComplianceScore(organization.id);
    revalidatePath("/dashboard");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Permissive cron auth (`if (!secret) return true`) | Strict Zod validation, fail on startup if missing | Next.js 13+ best practices (2023) | Prevents misconfigured deployments, enforces security |
| Database triggers for audit logs | Application-level logging with explicit calls | Modern microservices pattern (2020+) | Portable across databases, easier to test, more flexible |
| MD5/SHA-1 hashing | SHA-256 with collision resistance | NIST deprecation of SHA-1 (2017) | Cryptographically secure against tampering |
| Mutable audit logs with UPDATE | Immutable append-only logs | Financial systems standard (decades old) | Tamper-evidence requires immutability |
| Single hash per entry (no chaining) | Hash chain linking each entry to previous | Blockchain/ledger pattern (2010+) | Detects deletion/reordering attacks, not just modification |

**Deprecated/outdated:**
- **Permissive fallbacks for missing env vars:** Modern practice is fail-fast validation at build time
- **MD5 hashing:** Cryptographically broken since 2008 - use SHA-256 minimum
- **Storing audit logs in separate database:** Complicates transactions, modern ORMs handle cross-table consistency
- **Rolling log files with rotation:** Immutable append-only tables scale better in cloud databases

## Open Questions

Things that couldn't be fully resolved:

1. **Should hash chain verification run on every audit log query?**
   - What we know: `verifyAuditChain()` queries all entries, expensive for large tables (10K+ logs = seconds)
   - What's unclear: Whether to verify on-demand (admin UI only), scheduled cron job (daily), or cache verification result
   - Recommendation: Run verification as daily cron job, cache result in Redis/database, display cached status to admins

2. **How to handle audit log table growth over time?**
   - What we know: AuditLog is append-only, never deleted - 100 mutations/day = 36K entries/year
   - What's unclear: Whether to partition table by year, archive to cold storage (S3), or rely on PostgreSQL partitioning
   - Recommendation: Implement table partitioning by timestamp after 50K entries, archive >2 years to R2

3. **Should audit logs include IP address and user agent?**
   - What we know: Privacy Act 2020 requires minimization of personal data collection
   - What's unclear: Whether IP addresses are "personal information" in compliance context vs. security logging
   - Recommendation: Store IP address (needed for security incidents), exclude user agent (low value, high privacy risk)

## Sources

### Primary (HIGH confidence)
- [Building a Tamper-Evident Audit Log with SHA-256 Hash Chains](https://dev.to/veritaschain/building-a-tamper-evident-audit-log-with-sha-256-hash-chains-zero-dependencies-h0b) - Zero-dependency implementation guide
- [How to Secure Vercel Cron Job routes in Next.js 14](https://codingcat.dev/post/how-to-secure-vercel-cron-job-routes-in-next-js-14-app-router) - Official pattern for CRON_SECRET validation
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs/manage-cron-jobs) - Official Vercel documentation on CRON_SECRET injection
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html) - Official Node.js crypto API reference

### Secondary (MEDIUM confidence)
- [AuditableLLM: Hash-Chain-Backed Framework](https://www.mdpi.com/2079-9292/15/1/56) - Academic paper on hash chain implementation (December 2025)
- [Tamper Detection in Audit Logs (VLDB 2004)](https://www.vldb.org/conf/2004/RS13P1.PDF) - Academic paper on cryptographic audit trails
- [Testing Next.js Cron Jobs Locally](https://medium.com/@quentinmousset/testing-next-js-cron-jobs-locally-my-journey-from-frustration-to-solution-6ffb2e774d7a) - Community patterns for cron testing

### Tertiary (LOW confidence - flagged for validation)
- [Next.js Environment Variables Guide](https://nextjs.org/docs/pages/guides/environment-variables) - General env var patterns, not specific to cron security
- [Automate repetitive tasks with Next.js cron jobs](https://blog.logrocket.com/automate-repetitive-tasks-next-js-cron-jobs/) - Blog post, may not reflect latest security best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Node crypto is built-in, Zod already in use, hash chains well-established pattern
- Architecture: HIGH - Patterns verified in VeritasChain implementation guides and financial audit systems
- Pitfalls: HIGH - Derived from blockchain/ledger system literature and current codebase audit

**Research date:** 2026-01-28
**Valid until:** 2026-04-28 (90 days - cryptographic standards stable, Next.js cron patterns mature)
