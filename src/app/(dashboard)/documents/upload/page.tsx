"use client";

import { useRouter } from "next/navigation";
import { DocumentUpload } from "@/components/documents/document-upload";

export default function UploadDocumentPage() {
  const router = useRouter();

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
          onSuccess={() => {
            router.push("/documents");
          }}
        />
      </div>
    </div>
  );
}
