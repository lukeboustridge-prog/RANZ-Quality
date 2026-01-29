"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import type { AuthUserStatus } from "@prisma/client";

const statusConfig: Record<
  AuthUserStatus,
  {
    label: string;
    icon: typeof CheckCircle;
    variant: "success" | "secondary" | "outline" | "destructive";
  }
> = {
  ACTIVE: {
    label: "Active",
    icon: CheckCircle,
    variant: "success",
  },
  PENDING_ACTIVATION: {
    label: "Pending",
    icon: Clock,
    variant: "secondary",
  },
  SUSPENDED: {
    label: "Suspended",
    icon: AlertTriangle,
    variant: "outline",
  },
  DEACTIVATED: {
    label: "Deactivated",
    icon: XCircle,
    variant: "destructive",
  },
};

interface UserStatusBadgeProps {
  status: AuthUserStatus;
  showIcon?: boolean;
  className?: string;
}

export function UserStatusBadge({
  status,
  showIcon = true,
  className,
}: UserStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
