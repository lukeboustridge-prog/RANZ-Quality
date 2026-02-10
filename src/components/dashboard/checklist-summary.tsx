import Link from "next/link";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChecklistSummaryData {
  activeChecklists: number;
  completedChecklists: number;
  checklists: Array<{
    id: string;
    projectName: string;
    templateName: string;
    percentage: number;
    completedItems: number;
    totalItems: number;
    isComplete: boolean;
    startedAt: string;
  }>;
}

export function ChecklistSummary({
  data,
}: {
  data: ChecklistSummaryData | null;
}) {
  if (!data) {
    return null;
  }

  const checklistsToShow = data.checklists.slice(0, 5);
  const hasMore = data.checklists.length > 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Checklist Progress</CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">
                {data.activeChecklists} active, {data.completedChecklists}{" "}
                completed
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-slate-100">
          {checklistsToShow.map((checklist) => (
            <li key={checklist.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/checklists/${checklist.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-emerald-600 transition-colors truncate"
                    >
                      {checklist.projectName}
                    </Link>
                    {checklist.isComplete && (
                      <Badge
                        variant="success"
                        className="text-[10px] px-1.5 py-0"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        Complete
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {checklist.templateName}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          checklist.isComplete ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${checklist.percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {checklist.completedItems}/{checklist.totalItems} items
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {hasMore && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <Link
              href="/checklists"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View all checklists
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
