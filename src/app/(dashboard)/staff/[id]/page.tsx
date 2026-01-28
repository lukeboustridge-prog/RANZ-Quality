"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { MemberForm } from "@/components/staff/member-form";
import { Loader2 } from "lucide-react";

interface MemberData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  lbpNumber?: string | null;
  lbpClass?: string | null;
}

export default function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [member, setMember] = useState<MemberData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchMember() {
      try {
        const res = await fetch(`/api/staff/${id}`);
        if (res.ok) {
          const data = await res.json();
          setMember(data);
        } else {
          router.push("/staff");
        }
      } catch (error) {
        console.error("Failed to fetch member:", error);
        router.push("/staff");
      } finally {
        setIsLoading(false);
      }
    }

    fetchMember();
  }, [id, router]);

  const handleSubmit = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    lbpNumber?: string;
    lbpClass?: string;
  }) => {
    setIsSaving(true);

    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/staff");
        router.refresh();
      } else {
        const error = await res.json();
        console.error("Failed to update staff member:", error);
      }
    } catch (error) {
      console.error("Failed to update staff member:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Staff Member</h1>
        <p className="text-slate-600">Update the details of this team member</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <MemberForm
          initialData={{
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone || undefined,
            role: member.role as any,
            lbpNumber: member.lbpNumber || undefined,
            lbpClass: member.lbpClass as any,
          }}
          onSubmit={handleSubmit}
          isLoading={isSaving}
        />
      </div>
    </div>
  );
}
