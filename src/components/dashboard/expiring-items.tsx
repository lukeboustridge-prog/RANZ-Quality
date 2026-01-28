import Link from "next/link";
import { Shield, User, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpiringItem {
  id: string;
  type: "insurance" | "lbp" | "document";
  title: string;
  expiryDate: string;
  daysRemaining: number;
  href: string;
}

interface ExpiringItemsProps {
  items: ExpiringItem[];
}

export function ExpiringItems({ items }: ExpiringItemsProps) {
  const getIcon = (type: ExpiringItem["type"]) => {
    switch (type) {
      case "insurance":
        return Shield;
      case "lbp":
        return User;
      case "document":
        return FileText;
    }
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 30) return "text-red-600 bg-red-50";
    if (days <= 60) return "text-yellow-600 bg-yellow-50";
    return "text-blue-600 bg-blue-50";
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Expiring Soon
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-slate-600 font-medium">Nothing expiring soon</p>
          <p className="text-sm text-slate-500">All items are up to date</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Expiring Soon
      </h2>
      <ul className="space-y-3">
        {items.map((item) => {
          const Icon = getIcon(item.type);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <Icon className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500">{item.expiryDate}</p>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold px-2 py-1 rounded-md",
                    getUrgencyColor(item.daysRemaining)
                  )}
                >
                  {item.daysRemaining}d
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/insurance"
        className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium mt-4"
      >
        View All
      </Link>
    </div>
  );
}
