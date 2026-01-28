import { Shield, Users, FileText, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stat {
  name: string;
  value: string | number;
  icon: typeof Shield;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

interface StatsCardsProps {
  stats: Stat[];
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <stat.icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <p className="text-2xl font-semibold text-slate-900">
                {stat.value}
              </p>
              {stat.change && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    stat.changeType === "positive" && "text-green-600",
                    stat.changeType === "negative" && "text-red-600",
                    stat.changeType === "neutral" && "text-slate-500"
                  )}
                >
                  {stat.change}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function getDefaultStats(data: {
  insuranceCount: number;
  staffCount: number;
  documentCount: number;
  complianceScore: number;
}) {
  return [
    {
      name: "Insurance Policies",
      value: data.insuranceCount,
      icon: Shield,
    },
    {
      name: "Staff Members",
      value: data.staffCount,
      icon: Users,
    },
    {
      name: "Documents",
      value: data.documentCount,
      icon: FileText,
    },
    {
      name: "Compliance Score",
      value: `${data.complianceScore}%`,
      icon: Award,
    },
  ];
}
