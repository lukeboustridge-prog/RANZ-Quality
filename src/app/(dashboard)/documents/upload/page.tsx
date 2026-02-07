"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DocumentUpload } from "@/components/documents/document-upload";
import type { ISOElement } from "@/types";

export default function UploadDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultElement = searchParams.get("element") as ISOElement | null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Upload Document</h1>
        <p className="text-slate-600">
          Add a new document to your QMS library
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <DocumentUpload
          defaultElement={defaultElement || undefined}
          onSuccess={() => {
            router.push("/documents");
          }}
        />
      </div>
    </div>
  );
}
