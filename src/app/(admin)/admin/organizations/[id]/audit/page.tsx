import { db } from "@/lib/db";
import { verifyAuditChain } from "@/lib/audit-log";
import { AuditTrailTable } from "./_components/audit-trail-table";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AuditTrailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;

  // Fetch organization
  const organization = await db.organization.findUnique({
    where: { id },
  });

  if (!organization) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Organization not found</h1>
        <p className="mt-2 text-muted-foreground">
          The organization with ID {id} does not exist.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-primary hover:underline">
          Return to Admin Dashboard
        </Link>
      </div>
    );
  }

  // Fetch audit logs for resources related to this organization
  // This includes: Organization itself, InsurancePolicy, Document, OrganizationMember
  const logs = await db.auditLog.findMany({
    where: {
      OR: [
        // Direct organization changes
        { resourceType: "Organization", resourceId: id },
        // Insurance policies for this org (metadata contains organizationId)
        {
          resourceType: "InsurancePolicy",
          metadata: { path: ["organizationId"], equals: id },
        },
        // Documents for this org
        {
          resourceType: "Document",
          metadata: { path: ["organizationId"], equals: id },
        },
        // Members for this org
        {
          resourceType: "OrganizationMember",
          metadata: { path: ["organizationId"], equals: id },
        },
      ],
    },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  // Verify hash chain integrity (shows overall system health)
  const chainVerification = await verifyAuditChain();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Admin Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-1">
            Audit Trail: {organization.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Viewing last 100 audit log entries for this organization
          </p>
        </div>

        <div className="flex items-center gap-2">
          {chainVerification.valid ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-700">
                Chain Verified ({chainVerification.totalEntries} entries)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-700">
                Chain Integrity Issue
              </span>
            </div>
          )}
        </div>
      </div>

      {!chainVerification.valid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800">Hash Chain Verification Failed</h3>
          <p className="text-sm text-red-600 mt-1">{chainVerification.message}</p>
          {chainVerification.brokenAt && (
            <p className="text-sm text-red-600 mt-1">
              First broken entry: #{chainVerification.brokenAt.toString()}
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <AuditTrailTable logs={logs} />
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          Audit logs are immutable and cryptographically linked using SHA-256 hash chains.
          Any tampering would break the chain verification above.
        </p>
      </div>
    </div>
  );
}
