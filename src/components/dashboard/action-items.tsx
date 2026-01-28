import Link from "next/link";
import { AlertTriangle, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  href: string;
  dueDate?: string;
}

interface ActionItemsProps {
  items: ActionItem[];
}

export function ActionItems({ items }: ActionItemsProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Priority Actions
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
          <p className="text-slate-600 font-medium">All caught up!</p>
          <p className="text-sm text-slate-500">No pending actions required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Priority Actions</h2>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {items.length} pending
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                  item.priority === "high" && "bg-red-100",
                  item.priority === "medium" && "bg-yellow-100",
                  item.priority === "low" && "bg-blue-100"
                )}
              >
                {item.priority === "high" ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {item.description}
                </p>
              </div>
              {item.dueDate && (
                <span className="text-xs text-slate-500">{item.dueDate}</span>
              )}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
