"use client";

import Link from "next/link";
import { User, Award, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VerifyLBPButton } from "@/components/staff/verify-lbp-button";
import { cn } from "@/lib/utils";
import {
  ORG_MEMBER_ROLE_LABELS,
  LBP_CLASS_LABELS,
  type OrgMemberRole,
  type LBPClass,
} from "@/types";

interface MemberCardProps {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    role: OrgMemberRole;
    lbpNumber?: string | null;
    lbpClass?: LBPClass | null;
    lbpVerified: boolean;
  };
  onDelete?: (id: string) => void;
}

export function MemberCard({ member, onDelete }: MemberCardProps) {
  const getRoleBadge = (role: OrgMemberRole) => {
    switch (role) {
      case "OWNER":
        return <Badge variant="default">Owner</Badge>;
      case "ADMIN":
        return <Badge variant="secondary">Admin</Badge>;
      default:
        return <Badge variant="outline">Staff</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {member.firstName} {member.lastName}
            </h3>
            <p className="text-sm text-slate-500">{member.email}</p>
            {member.phone && (
              <p className="text-sm text-slate-400">{member.phone}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getRoleBadge(member.role)}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/staff/${member.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              {onDelete && member.role !== "OWNER" && (
                <DropdownMenuItem
                  onClick={() => onDelete(member.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {member.lbpNumber && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  member.lbpVerified ? "bg-green-100" : "bg-yellow-100"
                )}
              >
                <Award
                  className={cn(
                    "h-4 w-4",
                    member.lbpVerified ? "text-green-600" : "text-yellow-600"
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  LBP {member.lbpNumber}
                </p>
                <div className="flex items-center gap-2">
                  {member.lbpClass && (
                    <span className="text-xs text-slate-500">
                      {LBP_CLASS_LABELS[member.lbpClass]}
                    </span>
                  )}
                  {member.lbpVerified ? (
                    <span className="text-xs text-green-600">Verified</span>
                  ) : (
                    <span className="text-xs text-yellow-600">Unverified</span>
                  )}
                </div>
              </div>
            </div>
            <VerifyLBPButton
              memberId={member.id}
              lbpNumber={member.lbpNumber}
              lbpVerified={member.lbpVerified}
            />
          </div>
        </div>
      )}
    </div>
  );
}
