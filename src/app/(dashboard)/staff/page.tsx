import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { MemberList } from "@/components/staff/member-list";

export default async function StaffPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      members: {
        orderBy: [{ role: "asc" }, { firstName: "asc" }],
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
          <h1 className="text-2xl font-bold text-slate-900">Staff Roster</h1>
          <p className="text-slate-600">
            Manage your team members and their qualifications
          </p>
        </div>
        <Button asChild>
          <Link href="/staff/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Link>
        </Button>
      </div>

      {organization.members.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No staff members yet
            </h3>
            <p className="text-slate-600 max-w-sm mb-6">
              Add your team members to track their LBP credentials and
              qualifications.
            </p>
            <Button asChild>
              <Link href="/staff/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Staff Member
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <MemberList
          members={organization.members.map((m) => ({
            ...m,
            role: m.role as any,
            lbpClass: m.lbpClass as any,
          }))}
        />
      )}
    </div>
  );
}
