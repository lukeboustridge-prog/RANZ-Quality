"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
  INSURANCE_POLICY_TYPE_LABELS,
  type InsurancePolicyType,
} from "@/types";

interface PolicyFormData {
  policyType: InsurancePolicyType;
  policyNumber: string;
  insurer: string;
  brokerName?: string;
  coverageAmount: string;
  excessAmount?: string;
  effectiveDate: string;
  expiryDate: string;
}

interface PolicyFormProps {
  initialData?: PolicyFormData & { id?: string };
  onSubmit: (data: PolicyFormData, file?: File) => Promise<void>;
  isLoading?: boolean;
}

const POLICY_TYPES = Object.entries(INSURANCE_POLICY_TYPE_LABELS) as [
  InsurancePolicyType,
  string,
][];

export function PolicyForm({ initialData, onSubmit, isLoading }: PolicyFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<PolicyFormData>({
    policyType: initialData?.policyType || "PUBLIC_LIABILITY",
    policyNumber: initialData?.policyNumber || "",
    insurer: initialData?.insurer || "",
    brokerName: initialData?.brokerName || "",
    coverageAmount: initialData?.coverageAmount || "",
    excessAmount: initialData?.excessAmount || "",
    effectiveDate: initialData?.effectiveDate || "",
    expiryDate: initialData?.expiryDate || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData, file || undefined);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="policyType">Policy Type *</Label>
          <Select
            value={formData.policyType}
            onValueChange={(value: InsurancePolicyType) =>
              setFormData({ ...formData, policyType: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select policy type" />
            </SelectTrigger>
            <SelectContent>
              {POLICY_TYPES.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="policyNumber">Policy Number *</Label>
          <Input
            id="policyNumber"
            value={formData.policyNumber}
            onChange={(e) =>
              setFormData({ ...formData, policyNumber: e.target.value })
            }
            placeholder="e.g., POL-12345"
            required
          />
        </div>

        <div>
          <Label htmlFor="insurer">Insurer *</Label>
          <Input
            id="insurer"
            value={formData.insurer}
            onChange={(e) =>
              setFormData({ ...formData, insurer: e.target.value })
            }
            placeholder="e.g., Vero Insurance"
            required
          />
        </div>

        <div>
          <Label htmlFor="brokerName">Broker Name</Label>
          <Input
            id="brokerName"
            value={formData.brokerName}
            onChange={(e) =>
              setFormData({ ...formData, brokerName: e.target.value })
            }
            placeholder="e.g., Crombie Lockwood"
          />
        </div>

        <div>
          <Label htmlFor="coverageAmount">Coverage Amount ($) *</Label>
          <Input
            id="coverageAmount"
            type="number"
            min="0"
            step="0.01"
            value={formData.coverageAmount}
            onChange={(e) =>
              setFormData({ ...formData, coverageAmount: e.target.value })
            }
            placeholder="e.g., 2000000"
            required
          />
        </div>

        <div>
          <Label htmlFor="excessAmount">Excess Amount ($)</Label>
          <Input
            id="excessAmount"
            type="number"
            min="0"
            step="0.01"
            value={formData.excessAmount}
            onChange={(e) =>
              setFormData({ ...formData, excessAmount: e.target.value })
            }
            placeholder="e.g., 1000"
          />
        </div>

        <div>
          <Label htmlFor="effectiveDate">Effective Date *</Label>
          <Input
            id="effectiveDate"
            type="date"
            value={formData.effectiveDate}
            onChange={(e) =>
              setFormData({ ...formData, effectiveDate: e.target.value })
            }
            required
          />
        </div>

        <div>
          <Label htmlFor="expiryDate">Expiry Date *</Label>
          <Input
            id="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={(e) =>
              setFormData({ ...formData, expiryDate: e.target.value })
            }
            required
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="certificate">Certificate of Insurance (PDF)</Label>
          <div className="mt-1">
            <label
              htmlFor="certificate"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              {file ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Upload className="h-5 w-5" />
                  <span>{file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-400">PDF up to 10MB</p>
                </div>
              )}
              <input
                id="certificate"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
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
        <LoadingButton
          type="submit"
          loading={isLoading}
          loadingText="Saving..."
        >
          {initialData?.id ? "Update Policy" : "Add Policy"}
        </LoadingButton>
      </div>
    </form>
  );
}
