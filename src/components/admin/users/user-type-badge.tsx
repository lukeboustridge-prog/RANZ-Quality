"use client";

import { Badge } from "@/components/ui/badge";
import type { AuthUserType } from "@prisma/client";

const typeConfig: Record<
  AuthUserType,
  {
    label: string;
    colorClass: string;
  }
> = {
  // RANZ roles - blue tones
  RANZ_ADMIN: {
    label: "RANZ Admin",
    colorClass: "bg-blue-600 text-white border-transparent",
  },
  RANZ_STAFF: {
    label: "RANZ Staff",
    colorClass: "bg-blue-500 text-white border-transparent",
  },
  RANZ_INSPECTOR: {
    label: "RANZ Inspector",
    colorClass: "bg-blue-400 text-white border-transparent",
  },
  // External inspector - purple
  EXTERNAL_INSPECTOR: {
    label: "External Inspector",
    colorClass: "bg-purple-500 text-white border-transparent",
  },
  // Member roles - slate tones
  MEMBER_COMPANY_ADMIN: {
    label: "Company Admin",
    colorClass: "bg-slate-600 text-white border-transparent",
  },
  MEMBER_COMPANY_USER: {
    label: "Company User",
    colorClass: "bg-slate-400 text-white border-transparent",
  },
};

interface UserTypeBadgeProps {
  userType: AuthUserType;
  className?: string;
}

export function UserTypeBadge({ userType, className }: UserTypeBadgeProps) {
  const config = typeConfig[userType];

  return (
    <Badge className={`${config.colorClass} ${className ?? ""}`}>
      {config.label}
    </Badge>
  );
}
