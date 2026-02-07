"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPLIER_STATUS_LABELS, type SupplierStatus } from "@/types";

export interface SupplierFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  categories: string[];
  apexCertified: boolean;
  apexCertId: string;
  status: SupplierStatus;
  rating: number | undefined;
  evaluationDate: string;
  nextReviewDate: string;
  evaluationNotes: string;
}

interface SupplierFormProps {
  initialData?: Partial<SupplierFormData> & { id?: string };
  isLoading?: boolean;
}

const STATUS_OPTIONS = Object.entries(SUPPLIER_STATUS_LABELS) as [
  SupplierStatus,
  string,
][];

const RATING_OPTIONS = [1, 2, 3, 4, 5];

export function SupplierForm({ initialData, isLoading }: SupplierFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categoriesInput, setCategoriesInput] = useState(
    initialData?.categories?.join(", ") ?? ""
  );
  const [formData, setFormData] = useState<SupplierFormData>({
    name: initialData?.name ?? "",
    contactPerson: initialData?.contactPerson ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    address: initialData?.address ?? "",
    categories: initialData?.categories ?? [],
    apexCertified: initialData?.apexCertified ?? false,
    apexCertId: initialData?.apexCertId ?? "",
    status: initialData?.status ?? "APPROVED",
    rating: initialData?.rating,
    evaluationDate: initialData?.evaluationDate ?? "",
    nextReviewDate: initialData?.nextReviewDate ?? "",
    evaluationNotes: initialData?.evaluationNotes ?? "",
  });

  const handleCategoriesChange = (value: string) => {
    setCategoriesInput(value);
    setFormData({
      ...formData,
      categories: value
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = initialData?.id
        ? `/api/suppliers/${initialData.id}`
        : "/api/suppliers";
      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          email: formData.email || undefined,
          contactPerson: formData.contactPerson || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          apexCertId: formData.apexCertId || undefined,
          rating: formData.rating || undefined,
          evaluationDate: formData.evaluationDate || undefined,
          nextReviewDate: formData.nextReviewDate || undefined,
          evaluationNotes: formData.evaluationNotes || undefined,
        }),
      });

      if (res.ok) {
        router.push("/suppliers");
        router.refresh();
      } else {
        const error = await res.json();
        console.error("Failed to save supplier:", error);
      }
    } catch (error) {
      console.error("Failed to save supplier:", error);
    } finally {
      setSaving(false);
    }
  };

  const loading = isLoading || saving;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Supplier Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="e.g., Metalcraft Roofing"
            required
          />
        </div>

        <div>
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input
            id="contactPerson"
            value={formData.contactPerson}
            onChange={(e) =>
              setFormData({ ...formData, contactPerson: e.target.value })
            }
            placeholder="e.g., John Smith"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="e.g., sales@supplier.co.nz"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="e.g., 09 123 4567"
          />
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            placeholder="e.g., 123 Industrial Ave, Auckland"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="categories">
            Categories (comma-separated)
          </Label>
          <Input
            id="categories"
            value={categoriesInput}
            onChange={(e) => handleCategoriesChange(e.target.value)}
            placeholder="e.g., Long-run steel, Membranes, Fasteners"
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: SupplierStatus) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rating">Rating (1-5)</Label>
          <Select
            value={formData.rating?.toString() ?? ""}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                rating: value ? parseInt(value) : undefined,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select rating" />
            </SelectTrigger>
            <SelectContent>
              {RATING_OPTIONS.map((r) => (
                <SelectItem key={r} value={r.toString()}>
                  {r} Star{r !== 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <Checkbox
            id="apexCertified"
            checked={formData.apexCertified}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                apexCertified: checked === true,
              })
            }
          />
          <Label htmlFor="apexCertified" className="mb-0">
            APEX Certified Supplier
          </Label>
        </div>

        {formData.apexCertified && (
          <div className="sm:col-span-2">
            <Label htmlFor="apexCertId">APEX Certification ID</Label>
            <Input
              id="apexCertId"
              value={formData.apexCertId}
              onChange={(e) =>
                setFormData({ ...formData, apexCertId: e.target.value })
              }
              placeholder="e.g., APEX-12345"
            />
          </div>
        )}

        <div>
          <Label htmlFor="evaluationDate">Evaluation Date</Label>
          <Input
            id="evaluationDate"
            type="date"
            value={formData.evaluationDate}
            onChange={(e) =>
              setFormData({ ...formData, evaluationDate: e.target.value })
            }
          />
        </div>

        <div>
          <Label htmlFor="nextReviewDate">Next Review Date</Label>
          <Input
            id="nextReviewDate"
            type="date"
            value={formData.nextReviewDate}
            onChange={(e) =>
              setFormData({ ...formData, nextReviewDate: e.target.value })
            }
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="evaluationNotes">Evaluation Notes</Label>
          <Textarea
            id="evaluationNotes"
            value={formData.evaluationNotes}
            onChange={(e) =>
              setFormData({ ...formData, evaluationNotes: e.target.value })
            }
            placeholder="Notes from supplier evaluation..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <LoadingButton
          type="submit"
          loading={loading}
          loadingText="Saving..."
        >
          {initialData?.id ? "Update Supplier" : "Add Supplier"}
        </LoadingButton>
      </div>
    </form>
  );
}
