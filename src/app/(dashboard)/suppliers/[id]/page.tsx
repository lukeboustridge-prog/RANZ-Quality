"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SupplierForm, type SupplierFormData } from "@/components/suppliers/supplier-form";
import type { SupplierStatus } from "@/types";

interface SupplierResponse {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  categories: string[];
  apexCertified: boolean;
  apexCertId: string | null;
  status: SupplierStatus;
  rating: number | null;
  evaluationDate: string | null;
  nextReviewDate: string | null;
  evaluationNotes: string | null;
}

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

export default function EditSupplierPage() {
  const params = useParams();
  const [supplier, setSupplier] = useState<SupplierResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSupplier() {
      try {
        const res = await fetch(`/api/suppliers/${params.id}`);
        if (res.ok) {
          setSupplier(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch supplier:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSupplier();
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-200 rounded w-64" />
          <div className="h-96 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900">
          Supplier not found
        </h1>
      </div>
    );
  }

  const initialData: Partial<SupplierFormData> & { id: string } = {
    id: supplier.id,
    name: supplier.name,
    contactPerson: supplier.contactPerson ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    address: supplier.address ?? "",
    categories: supplier.categories,
    apexCertified: supplier.apexCertified,
    apexCertId: supplier.apexCertId ?? "",
    status: supplier.status,
    rating: supplier.rating ?? undefined,
    evaluationDate: formatDateForInput(supplier.evaluationDate),
    nextReviewDate: formatDateForInput(supplier.nextReviewDate),
    evaluationNotes: supplier.evaluationNotes ?? "",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Supplier</h1>
        <p className="text-slate-600">Update supplier details</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <SupplierForm initialData={initialData} />
      </div>
    </div>
  );
}
