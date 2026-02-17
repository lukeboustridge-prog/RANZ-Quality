import { db } from "./db";
import { auth } from "@clerk/nextjs/server";
import { AuditAction, Prisma } from "@prisma/client";
import { createHash, randomUUID } from "crypto";

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
 * - Tampering with any entry breaks the chain for all subsequent entries
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    // Get actor information (userId from Clerk, or system for cron jobs)
    let actorId = "system:unknown";
    let actorEmail = "system@ranz.co.nz";
    let actorRole = "system";

    try {
      const authResult = await auth();
      if (authResult.userId) {
        actorId = authResult.userId;
        // In production, fetch email from Clerk. For now, use placeholder.
        actorEmail = `user-${authResult.userId}@ranz.co.nz`;
        actorRole = "org:member";
      }
    } catch {
      // Auth may fail in cron/webhook contexts - use system identity
      actorId = "system:cron";
    }

    // Fetch most recent audit log entry to chain to
    const previousEntry = await db.auditLog.findFirst({
      orderBy: { id: "desc" },
      select: { hash: true },
    });

    const eventId = randomUUID();
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
      timestamp.toISOString(),
      previousHash || "genesis",
      JSON.stringify(input.previousState || null),
      JSON.stringify(input.newState || null),
      JSON.stringify(input.metadata || null),
    ].join("|");

    const hash = createHash("sha256").update(hashInput).digest("hex");

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
        previousState: input.previousState ? (input.previousState as Prisma.InputJsonValue) : Prisma.DbNull,
        newState: input.newState ? (input.newState as Prisma.InputJsonValue) : Prisma.DbNull,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
        hash,
        previousHash,
        timestamp,
      },
    });
  } catch (error) {
    // Log but don't throw - audit logging failure shouldn't break application
    console.error("Failed to create audit log:", error);
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

      const recomputedHash = createHash("sha256")
        .update(hashInput)
        .digest("hex");

      if (entry.hash !== recomputedHash) {
        return {
          valid: false,
          brokenAt: entry.id,
          message: `Entry ${entry.id} tampered - stored hash doesn't match recomputed hash`,
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
 * Convenience wrapper for logging insurance policy mutations.
 */
export async function logInsuranceMutation(
  action: "CREATE" | "UPDATE" | "DELETE",
  policyId: string,
  previousState: Record<string, unknown> | null,
  newState: Record<string, unknown> | null,
  metadata?: { organizationId: string; certificateUploaded?: boolean }
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
 * Convenience wrapper for logging document mutations.
 */
export async function logDocumentMutation(
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT",
  documentId: string,
  previousState: Record<string, unknown> | null,
  newState: Record<string, unknown> | null,
  metadata?: { organizationId?: string; versionId?: string }
): Promise<void> {
  await createAuditLog({
    action,
    resourceType: "Document",
    resourceId: documentId,
    previousState,
    newState,
    metadata,
  });
}

/**
 * Convenience wrapper for logging member mutations.
 */
export async function logMemberMutation(
  action: "CREATE" | "UPDATE" | "DELETE" | "VERIFY",
  memberId: string,
  previousState: Record<string, unknown> | null,
  newState: Record<string, unknown> | null,
  metadata?: { organizationId?: string; lbpVerification?: boolean }
): Promise<void> {
  await createAuditLog({
    action,
    resourceType: "OrganizationMember",
    resourceId: memberId,
    previousState,
    newState,
    metadata,
  });
}
