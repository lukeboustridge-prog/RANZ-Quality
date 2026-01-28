import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Plus, Shield } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PolicyList } from "@/components/insurance/policy-list";

export default async function InsurancePage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      insurancePolicies: {
        orderBy: { expiryDate: "asc" },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Insurance Policies
          </h1>
          <p className="text-slate-600">
            Manage your business insurance certificates
          </p>
        </div>
        <Button asChild>
          <Link href="/insurance/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Policy
          </Link>
        </Button>
      </div>

      {organization.insurancePolicies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No insurance policies yet
            </h3>
            <p className="text-slate-600 max-w-sm mb-6">
              Add your insurance certificates to track expiry dates and maintain
              compliance.
            </p>
            <Button asChild>
              <Link href="/insurance/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Policy
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <PolicyList
          policies={organization.insurancePolicies.map((p) => ({
            ...p,
            coverageAmount: p.coverageAmount.toString(),
          }))}
        />
      )}
    </div>
  );
}
