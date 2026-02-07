"use client";

import { SupplierForm } from "@/components/suppliers/supplier-form";

export default function NewSupplierPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Add Supplier</h1>
        <p className="text-slate-600">
          Add a new supplier to your approved register
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <SupplierForm />
      </div>
    </div>
  );
}
