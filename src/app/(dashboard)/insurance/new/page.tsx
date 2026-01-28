"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PolicyForm } from "@/components/insurance/policy-form";

export default function NewInsurancePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (
    data: {
      policyType: string;
      policyNumber: string;
      insurer: string;
      brokerName?: string;
      coverageAmount: string;
      excessAmount?: string;
      effectiveDate: string;
      expiryDate: string;
    },
    file?: File
  ) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("policyType", data.policyType);
        formData.append("policyNumber", data.policyNumber);
        formData.append("insurer", data.insurer);
        if (data.brokerName) formData.append("brokerName", data.brokerName);
        formData.append("coverageAmount", data.coverageAmount);
        if (data.excessAmount) formData.append("excessAmount", data.excessAmount);
        formData.append("effectiveDate", data.effectiveDate);
        formData.append("expiryDate", data.expiryDate);
        if (file) formData.append("certificate", file);

        const res = await fetch("/api/insurance", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          router.push("/insurance");
          router.refresh();
        } else {
          const error = await res.json();
          console.error("Failed to create policy:", error);
        }
      } catch (error) {
        console.error("Failed to create policy:", error);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Add Insurance Policy
        </h1>
        <p className="text-slate-600">
          Enter the details of your insurance certificate
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <PolicyForm onSubmit={handleSubmit} isLoading={isPending} />
      </div>
    </div>
  );
}
