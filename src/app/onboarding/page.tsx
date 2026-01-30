"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useOrganizationList } from "@clerk/nextjs";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const { createOrganization, setActive } = useOrganizationList();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    tradingName: "",
    nzbn: "",
    email: "",
    phone: "",
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createOrganization || !setActive) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create Clerk organization
      const org = await createOrganization({
        name: formData.businessName,
      });

      // Set it as active and wait for session to update
      await setActive({ organization: org.id });

      // Small delay to ensure Clerk session propagates
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create the organization in our database
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
              disabled={isLoading || !formData.businessName || !formData.email}
            >
              {isLoading ? (
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
