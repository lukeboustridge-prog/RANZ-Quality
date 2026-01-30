import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/r2";
import { OrganizationProfileForm } from "@/components/settings/organization-profile-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { StaffInvitationForm } from "@/components/settings/staff-invitation-form";
import { PendingInvitations } from "@/components/settings/pending-invitations";

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

  // Get signed URL for logo if exists
  let logoUrl: string | null = null;
  if (organization.logoKey) {
    try {
      logoUrl = await getSignedDownloadUrl(organization.logoKey);
    } catch (e) {
      console.warn("Failed to get logo URL:", e);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your company profile and notification preferences
        </p>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Company Profile
          </h2>
          <OrganizationProfileForm
            organization={{
              id: organization.id,
              name: organization.name,
              tradingName: organization.tradingName,
              email: organization.email,
              phone: organization.phone,
              address: organization.address,
              city: organization.city,
              description: organization.description,
              logoKey: organization.logoKey,
            }}
            logoUrl={logoUrl}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Notification Preferences
          </h2>
          <NotificationSettings />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Staff Management
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Invite New Staff</h3>
              <StaffInvitationForm />
            </div>
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Pending Invitations</h3>
              <PendingInvitations />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
