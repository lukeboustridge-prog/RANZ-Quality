"use client";

import { useState, useEffect, use, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PolicyForm } from "@/components/insurance/policy-form";
import { Loader2 } from "lucide-react";

interface PolicyData {
  id: string;
  policyType: string;
  policyNumber: string;
  insurer: string;
  brokerName?: string;
  coverageAmount: number;
  excessAmount?: number;
  effectiveDate: string;
  expiryDate: string;
}

export default function EditInsurancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchPolicy() {
      try {
        const res = await fetch(`/api/insurance/${id}`);
        if (res.ok) {
          const data = await res.json();
          setPolicy(data);
        } else {
          router.push("/insurance");
        }
      } catch (error) {
        console.error("Failed to fetch policy:", error);
        router.push("/insurance");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPolicy();
  }, [id, router]);

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

        const res = await fetch(`/api/insurance/${id}`, {
          method: "PUT",
          body: formData,
        });

        if (res.ok) {
          router.push("/insurance");
          router.refresh();
        } else {
          const error = await res.json();
          console.error("Failed to update policy:", error);
        }
      } catch (error) {
        console.error("Failed to update policy:", error);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!policy) {
    return null;
  }

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Edit Insurance Policy
        </h1>
        <p className="text-slate-600">Update the details of your policy</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <PolicyForm
          initialData={{
            id: policy.id,
            policyType: policy.policyType as any,
            policyNumber: policy.policyNumber,
            insurer: policy.insurer,
            brokerName: policy.brokerName,
            coverageAmount: policy.coverageAmount.toString(),
            excessAmount: policy.excessAmount?.toString(),
            effectiveDate: formatDateForInput(policy.effectiveDate),
            expiryDate: formatDateForInput(policy.expiryDate),
          }}
          onSubmit={handleSubmit}
          isLoading={isPending}
        />
      </div>
    </div>
  );
}
