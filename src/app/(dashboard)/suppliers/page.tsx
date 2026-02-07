import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Plus, Package } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { SupplierList } from "@/components/suppliers/supplier-list";

export default async function SuppliersPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      approvedSuppliers: {
        orderBy: { name: "asc" },
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
            Approved Suppliers
          </h1>
          <p className="text-slate-600">
            Manage your approved supplier register
          </p>
        </div>
        <Button asChild>
          <Link href="/suppliers/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Link>
        </Button>
      </div>

      {organization.approvedSuppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No approved suppliers yet
            </h3>
            <p className="text-slate-600 max-w-sm mb-6">
              Build your approved supplier register to track evaluated and
              certified material suppliers.
            </p>
            <Button asChild>
              <Link href="/suppliers/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Supplier
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <SupplierList suppliers={organization.approvedSuppliers} />
      )}
    </div>
  );
}
