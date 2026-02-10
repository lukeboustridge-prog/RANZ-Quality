import { format } from "date-fns";
import { Award, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProgrammeEnrolmentStatus } from "@/types";

interface ProgrammeBadgeProps {
  enrolment: {
    status: ProgrammeEnrolmentStatus;
    activeSince: Date | null;
    anniversaryDate: Date | null;
  } | null;
}

const statusConfig: Record<
  Exclude<ProgrammeEnrolmentStatus, "WITHDRAWN">,
  {
    icon: typeof Award;
    title: string;
    subtitle: (props: ProgrammeBadgeProps["enrolment"]) => string;
    borderColor: string;
    bgColor: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    subtitleColor: string;
    badgeVariant: string;
    badgeLabel: string;
  }
> = {
  ACTIVE: {
    icon: Award,
    title: "RoofWright Programme Member",
    subtitle: (e) =>
      e?.activeSince
        ? `Active since ${format(new Date(e.activeSince), "MMMM yyyy")}`
        : "Active member",
    borderColor: "border-green-200",
    bgColor: "bg-green-50",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    titleColor: "text-green-900",
    subtitleColor: "text-green-700",
    badgeVariant: "bg-green-100 text-green-800",
    badgeLabel: "Active",
  },
  PENDING: {
    icon: Award,
    title: "RoofWright Programme - Application Pending",
    subtitle: () => "Your application is under review",
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    titleColor: "text-amber-900",
    subtitleColor: "text-amber-700",
    badgeVariant: "bg-amber-100 text-amber-800",
    badgeLabel: "Pending",
  },
  RENEWAL_DUE: {
    icon: AlertTriangle,
    title: "RoofWright Programme - Renewal Due",
    subtitle: (e) =>
      e?.anniversaryDate
        ? `Your annual renewal is due on ${format(new Date(e.anniversaryDate), "d MMMM yyyy")}`
        : "Your annual renewal is due",
    borderColor: "border-orange-200",
    bgColor: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    titleColor: "text-orange-900",
    subtitleColor: "text-orange-700",
    badgeVariant: "bg-orange-100 text-orange-800",
    badgeLabel: "Renewal Due",
  },
  SUSPENDED: {
    icon: XCircle,
    title: "RoofWright Programme - Suspended",
    subtitle: () => "Your programme membership has been suspended",
    borderColor: "border-red-200",
    bgColor: "bg-red-50",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    titleColor: "text-red-900",
    subtitleColor: "text-red-700",
    badgeVariant: "bg-red-100 text-red-800",
    badgeLabel: "Suspended",
  },
};

export function ProgrammeBadge({ enrolment }: ProgrammeBadgeProps) {
  if (!enrolment) return null;
  if (enrolment.status === "WITHDRAWN") return null;

  const config = statusConfig[enrolment.status];
  const Icon = config.icon;

  return (
    <Card className={`${config.borderColor} ${config.bgColor}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div
            className={`h-12 w-12 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0`}
          >
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className={`text-lg font-semibold ${config.titleColor}`}>
                {config.title}
              </h2>
              <Badge className={config.badgeVariant}>
                {config.badgeLabel}
              </Badge>
            </div>
            <p className={`mt-1 text-sm ${config.subtitleColor}`}>
              {config.subtitle(enrolment)}
            </p>
            {enrolment.status === "ACTIVE" && (
              <div className="flex items-center gap-1.5 mt-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-600 font-medium">
                  Verified programme member
                </span>
              </div>
            )}
            {enrolment.status === "SUSPENDED" && (
              <a
                href="/programme"
                className="inline-block mt-2 text-sm text-red-700 underline hover:text-red-800"
              >
                View programme details
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
