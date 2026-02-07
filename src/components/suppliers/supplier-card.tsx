"use client";

import Link from "next/link";
import {
  Package,
  Star,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Award,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPLIER_STATUS_LABELS, type SupplierStatus } from "@/types";

interface SupplierCardProps {
  supplier: {
    id: string;
    name: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    categories: string[];
    apexCertified: boolean;
    status: SupplierStatus;
    rating: number | null;
    nextReviewDate: Date | string | null;
  };
  onDelete?: (id: string) => void;
}

function getStatusVariant(status: SupplierStatus) {
  switch (status) {
    case "APPROVED":
      return "success" as const;
    case "CONDITIONAL":
      return "warning" as const;
    case "SUSPENDED":
      return "destructive" as const;
    case "REMOVED":
      return "secondary" as const;
  }
}

export function SupplierCard({ supplier, onDelete }: SupplierCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{supplier.name}</h3>
            {supplier.contactPerson && (
              <p className="text-sm text-slate-500">{supplier.contactPerson}</p>
            )}
            {supplier.email && (
              <p className="text-xs text-slate-400 mt-0.5">{supplier.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(supplier.status)}>
            {SUPPLIER_STATUS_LABELS[supplier.status]}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/suppliers/${supplier.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(supplier.id)}
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

      <div className="mt-4 flex flex-wrap gap-1.5">
        {supplier.categories.map((cat) => (
          <Badge key={cat} variant="outline" className="text-xs">
            {cat}
          </Badge>
        ))}
        {supplier.apexCertified && (
          <Badge variant="default" className="text-xs bg-emerald-600">
            <Award className="h-3 w-3 mr-1" />
            APEX
          </Badge>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4">
        {supplier.rating && (
          <div className="flex items-center gap-1 text-sm">
            <Star
              className={cn(
                "h-4 w-4",
                supplier.rating >= 4
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-slate-400"
              )}
            />
            <span className="text-slate-600">{supplier.rating}/5</span>
          </div>
        )}
        {supplier.nextReviewDate && (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">
              Review: {formatDate(supplier.nextReviewDate)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
