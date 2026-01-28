"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MemberForm } from "@/components/staff/member-form";

export default function NewStaffPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    lbpNumber?: string;
    lbpClass?: string;
  }) => {
    setIsLoading(true);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/staff");
        router.refresh();
      } else {
        const error = await res.json();
        console.error("Failed to create staff member:", error);
      }
    } catch (error) {
      console.error("Failed to create staff member:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Add Staff Member</h1>
        <p className="text-slate-600">
          Enter the details of your new team member
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <MemberForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
