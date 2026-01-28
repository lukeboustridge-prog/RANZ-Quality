"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/ui/loading-button";
import { CheckCircle } from "lucide-react";

interface VerifyLBPButtonProps {
  memberId: string;
  lbpNumber?: string | null;
  lbpVerified: boolean;
  onSuccess?: () => void;
}

export function VerifyLBPButton({
  memberId,
  lbpNumber,
  lbpVerified,
  onSuccess,
}: VerifyLBPButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!lbpNumber) {
    return null;
  }

  const handleVerify = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/staff/${memberId}/verify-lbp`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          console.error("LBP verification failed:", data.error);
          return;
        }

        const result = await response.json();
        console.log("LBP verification result:", result);

        router.refresh();
        onSuccess?.();
      } catch (error) {
        console.error("Failed to verify LBP:", error);
      }
    });
  };

  return (
    <LoadingButton
      size="sm"
      variant={lbpVerified ? "outline" : "default"}
      onClick={handleVerify}
      loading={isPending}
      loadingText="Verifying..."
      disabled={lbpVerified}
    >
      <CheckCircle className="h-4 w-4 mr-2" />
      {lbpVerified ? "Verified" : "Verify LBP"}
    </LoadingButton>
  );
}
