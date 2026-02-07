import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Upload, ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { getAllTemplateGuides } from "@/lib/iso-templates";
import { ISO_ELEMENT_LABELS } from "@/types";
import type { ISOElement } from "@prisma/client";

export default async function TemplateGuidePage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  const organization = await db.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      documents: {
        where: { deletedAt: null },
        select: { isoElement: true, status: true },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  // Count documents per element
  const docCountByElement: Record<string, { total: number; approved: number }> = {};
  for (const doc of organization.documents) {
    if (!docCountByElement[doc.isoElement]) {
      docCountByElement[doc.isoElement] = { total: 0, approved: 0 };
    }
    docCountByElement[doc.isoElement].total++;
    if (doc.status === "APPROVED") {
      docCountByElement[doc.isoElement].approved++;
    }
  }

  const templates = getAllTemplateGuides();
  const coveredElements = Object.keys(docCountByElement).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            ISO Element Template Guide
          </h1>
          <p className="text-slate-600">
            What to upload for each of the 19 ISO elements &mdash;{" "}
            <span className="font-medium">
              {coveredElements}/19 elements covered
            </span>
          </p>
        </div>
      </div>

      {/* Progress overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-sm font-medium text-slate-700">
            Documentation Coverage
          </div>
          <div className="text-sm text-slate-500">
            {coveredElements} of 19 elements have documents
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all"
            style={{ width: `${(coveredElements / 19) * 100}%` }}
          />
        </div>
      </div>

      {/* Element cards */}
      <div className="space-y-4">
        {templates.map((template) => {
          const counts = docCountByElement[template.element];
          const hasDocs = counts && counts.total > 0;
          const hasApproved = counts && counts.approved > 0;

          return (
            <details
              key={template.element}
              className="group bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <summary className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                {hasApproved ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : hasDocs ? (
                  <CheckCircle2 className="h-5 w-5 text-yellow-500 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900">
                    {template.number}. {template.name}
                  </div>
                  <div className="text-sm text-slate-500 truncate">
                    {template.description.slice(0, 100)}...
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {counts ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                      {counts.total} doc{counts.total !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                      No docs
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                </div>
              </summary>

              <div className="border-t border-slate-100 p-4 space-y-4">
                <p className="text-sm text-slate-600">{template.description}</p>

                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">
                    Example Documents to Upload
                  </h4>
                  <div className="space-y-2">
                    {template.exampleDocuments.map((doc, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 rounded-lg p-3 text-sm"
                      >
                        <div className="font-medium text-slate-800">
                          {doc.title}{" "}
                          <span className="text-slate-400 font-normal">
                            ({doc.type})
                          </span>
                        </div>
                        <div className="text-slate-600 mt-1">
                          {doc.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">
                    What Auditors Look For
                  </h4>
                  <ul className="space-y-1">
                    {template.auditorChecklist.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-slate-600 flex items-start gap-2"
                      >
                        <span className="text-slate-400 mt-0.5">&#x2022;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Guidance
                  </h4>
                  <p className="text-sm text-blue-800">{template.guidance}</p>
                </div>

                <Button asChild size="sm">
                  <Link
                    href={`/documents/upload?element=${template.element}`}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload for {template.name}
                  </Link>
                </Button>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
