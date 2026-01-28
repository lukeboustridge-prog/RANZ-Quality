"use client";

import Link from "next/link";
import { Shield, Calendar, DollarSign, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, daysUntil, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { INSURANCE_POLICY_TYPE_LABELS, type InsurancePolicyType } from "@/types";

interface PolicyCardProps {
  policy: {
    id: string;
    policyType: InsurancePolicyType;
    policyNumber: string;
    insurer: string;
    coverageAmount: string | number;
    expiryDate: Date | string;
    verified: boolean;
  };
  onDelete?: (id: string) => void;
}

export function PolicyCard({ policy, onDelete }: PolicyCardProps) {
  const days = daysUntil(policy.expiryDate);
  const isExpired = days < 0;
  const isExpiringSoon = days >= 0 && days <= 30;
  const isExpiringMedium = days > 30 && days <= 60;

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (isExpiringSoon) {
      return <Badge variant="warning">Expires in {days}d</Badge>;
    }
    if (isExpiringMedium) {
      return <Badge variant="warning">Expires in {days}d</Badge>;
    }
    if (policy.verified) {
      return <Badge variant="success">Verified</Badge>;
    }
    return <Badge variant="secondary">Active</Badge>;
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-6 transition-all",
        isExpired
          ? "border-red-200 bg-red-50/50"
          : isExpiringSoon
            ? "border-yellow-200 bg-yellow-50/50"
            : "border-slate-200 hover:border-slate-300"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              isExpired
                ? "bg-red-100"
                : isExpiringSoon
                  ? "bg-yellow-100"
                  : "bg-blue-100"
            )}
          >
            <Shield
              className={cn(
                "h-6 w-6",
                isExpired
                  ? "text-red-600"
                  : isExpiringSoon
                    ? "text-yellow-600"
                    : "text-blue-600"
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {INSURANCE_POLICY_TYPE_LABELS[policy.policyType]}
            </h3>
            <p className="text-sm text-slate-500">{policy.insurer}</p>
            <p className="text-xs text-slate-400 mt-1">
              Policy: {policy.policyNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/insurance/${policy.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(policy.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600">
            {formatCurrency(policy.coverageAmount)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span
            className={cn(
              isExpired
                ? "text-red-600"
                : isExpiringSoon
                  ? "text-yellow-600"
                  : "text-slate-600"
            )}
          >
            {formatDate(policy.expiryDate)}
          </span>
        </div>
      </div>
    </div>
  );
}
