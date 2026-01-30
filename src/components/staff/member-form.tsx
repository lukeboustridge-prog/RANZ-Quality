"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ORG_MEMBER_ROLE_LABELS,
  LBP_CLASS_LABELS,
  type OrgMemberRole,
  type LBPClass,
} from "@/types";

interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: OrgMemberRole;
  lbpNumber?: string;
  lbpClass?: LBPClass;
}

interface MemberFormProps {
  initialData?: MemberFormData & { id?: string };
  onSubmit: (data: MemberFormData) => Promise<void>;
  isLoading?: boolean;
}

const ROLES = Object.entries(ORG_MEMBER_ROLE_LABELS) as [OrgMemberRole, string][];
const LBP_CLASSES = Object.entries(LBP_CLASS_LABELS) as [LBPClass, string][];

export function MemberForm({ initialData, onSubmit, isLoading }: MemberFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    role: initialData?.role || "STAFF",
    lbpNumber: initialData?.lbpNumber || "",
    lbpClass: initialData?.lbpClass,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            placeholder="John"
            required
          />
        </div>

        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            placeholder="Smith"
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="john@example.co.nz"
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="021 123 4567"
          />
        </div>

        <div>
          <Label htmlFor="role">Role *</Label>
          <Select
            value={formData.role}
            onValueChange={(value: OrgMemberRole) =>
              setFormData({ ...formData, role: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <div className="border-t border-slate-200 pt-6 mt-2">
            <h3 className="text-sm font-medium text-slate-900 mb-4">
              LBP Credentials (Optional)
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="lbpNumber">LBP Number</Label>
                <Input
                  id="lbpNumber"
                  value={formData.lbpNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, lbpNumber: e.target.value })
                  }
                  placeholder="BP123456"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter the 8-character LBP number
                </p>
              </div>

              <div>
                <Label htmlFor="lbpClass">LBP Class</Label>
                <Select
                  value={formData.lbpClass || "none"}
                  onValueChange={(value: LBPClass | "none") =>
                    setFormData({
                      ...formData,
                      lbpClass: value === "none" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select LBP class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {LBP_CLASSES.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : initialData?.id ? (
            "Update Member"
          ) : (
            "Add Member"
          )}
        </Button>
      </div>
    </form>
  );
}
