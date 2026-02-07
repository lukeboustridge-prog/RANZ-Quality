import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Plus, FileText, BookOpen } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/documents/document-list";

export default async function DocumentsPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      documents: {
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            QMS Documents
          </h1>
          <p className="text-slate-600">
            Manage your quality management system documentation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/documents/templates">
              <BookOpen className="h-4 w-4 mr-2" />
              Template Guide
            </Link>
          </Button>
          <Button asChild>
            <Link href="/documents/upload">
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Link>
          </Button>
        </div>
      </div>

      {organization.documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No documents yet
            </h3>
            <p className="text-slate-600 max-w-sm mb-6">
              Upload your QMS documents to track compliance with the 19 ISO
              elements. Not sure what to upload?{" "}
              <Link href="/documents/templates" className="text-blue-600 hover:underline">
                View the template guide
              </Link>{" "}
              to see what&apos;s needed for each element.
            </p>
            <Button asChild>
              <Link href="/documents/upload">
                <Plus className="h-4 w-4 mr-2" />
                Upload Your First Document
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <DocumentList
          documents={organization.documents.map((d) => ({
            ...d,
            isoElement: d.isoElement as any,
            documentType: d.documentType as any,
          }))}
        />
      )}
    </div>
  );
}
