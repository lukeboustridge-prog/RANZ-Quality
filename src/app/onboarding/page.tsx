"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useOrganizationList, useAuth } from "@clerk/nextjs";
import { AlertTriangle, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DuplicateOrg {
  id: string;
  name: string;
  tradingName: string | null;
  nzbn: string | null;
  email: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { createOrganization, setActive } = useOrganizationList();

  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    tradingName: "",
    nzbn: "",
    email: "",
    phone: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateOrg[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createOrganization || !setActive) return;

    setError(null);

    // Skip duplicate check if user already confirmed the warning
    if (!confirmed) {
      setIsChecking(true);
      try {
        const checkResponse = await fetch("/api/organizations/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.businessName,
            nzbn: formData.nzbn || undefined,
          }),
        });

        if (!checkResponse.ok) {
          throw new Error("Failed to check for duplicates");
        }

        const { duplicates, nzbnConflict } = await checkResponse.json();

        if (nzbnConflict) {
          setError(
            "A business with this NZBN is already registered. Contact RANZ if you believe this is an error."
          );
          setIsChecking(false);
          return;
        }

        if (duplicates.length > 0) {
          setDuplicateWarning(duplicates);
          setIsChecking(false);
          return;
        }
      } catch {
        // If the check fails, proceed anyway — the server-side guard will catch NZBN conflicts
        console.error("Duplicate check failed, proceeding with creation");
      } finally {
        setIsChecking(false);
      }
    }

    setIsLoading(true);

    try {
      // Create Clerk organization
      const org = await createOrganization({
        name: formData.businessName,
      });

      // Set it as active and wait for session to update
      await setActive({ organization: org.id });

      // Small delay to ensure Clerk session propagates
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get fresh auth token after org is active
      const token = await getToken();

      // Create the organization in our database
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          clerkOrgId: org.id,
          name: formData.businessName,
          tradingName: formData.tradingName || null,
          nzbn: formData.nzbn || null,
          email: formData.email || user?.primaryEmailAddress?.emailAddress,
          phone: formData.phone || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create organization: ${response.status}`);
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create organization:", error);
      setError(error instanceof Error ? error.message : "Failed to create organization. Please try again.");
      setIsLoading(false);
    }
  };

  const handleConfirmDuplicate = () => {
    setConfirmed(true);
    setDuplicateWarning(null);
  };

  const handleCancelDuplicate = () => {
    setDuplicateWarning(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Set Up Your Business
              </h1>
              <p className="text-slate-600 text-sm">
                Enter your business details to get started
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {duplicateWarning && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 text-sm">
                      A business with a similar name already exists
                    </p>
                    <p className="text-amber-700 text-sm mt-1">
                      Is this a different business?
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  {duplicateWarning.map((org) => (
                    <div
                      key={org.id}
                      className="bg-white border border-amber-100 rounded p-2 text-sm"
                    >
                      <p className="font-medium text-slate-900">{org.name}</p>
                      {org.tradingName && (
                        <p className="text-slate-500">Trading as: {org.tradingName}</p>
                      )}
                      {org.email && (
                        <p className="text-slate-500">{org.email}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelDuplicate}
                  >
                    Go Back
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConfirmDuplicate}
                  >
                    Yes, this is a different business
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                placeholder="Example Roofing Ltd"
                required
              />
            </div>

            <div>
              <Label htmlFor="tradingName">Trading Name (if different)</Label>
              <Input
                id="tradingName"
                value={formData.tradingName}
                onChange={(e) =>
                  setFormData({ ...formData, tradingName: e.target.value })
                }
                placeholder="Example Roofing"
              />
            </div>

            <div>
              <Label htmlFor="nzbn">NZBN (New Zealand Business Number)</Label>
              <Input
                id="nzbn"
                value={formData.nzbn}
                onChange={(e) =>
                  setFormData({ ...formData, nzbn: e.target.value })
                }
                placeholder="9429041234567"
              />
            </div>

            <div>
              <Label htmlFor="email">Business Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="info@example.co.nz"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Business Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="09 123 4567"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isChecking || !formData.businessName || !formData.email}
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Business"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
