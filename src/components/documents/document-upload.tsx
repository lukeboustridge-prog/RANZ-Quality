"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
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
  ISO_ELEMENT_LABELS,
  DOCUMENT_TYPE_LABELS,
  type ISOElement,
  type DocumentType,
} from "@/types";

const ISO_ELEMENTS = Object.entries(ISO_ELEMENT_LABELS) as [ISOElement, string][];
const DOCUMENT_TYPES = Object.entries(DOCUMENT_TYPE_LABELS) as [
  DocumentType,
  string,
][];

interface DocumentUploadProps {
  onSuccess?: () => void;
  defaultElement?: ISOElement;
}

export function DocumentUpload({ onSuccess, defaultElement }: DocumentUploadProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    isoElement: (defaultElement || "") as ISOElement | "",
    documentType: "OTHER" as DocumentType,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !formData.isoElement) return;

    setIsLoading(true);

    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("isoElement", formData.isoElement);
      data.append("documentType", formData.documentType);
      data.append("file", file);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: data,
      });

      if (res.ok) {
        setFile(null);
        setFormData({
          title: "",
          isoElement: "",
          documentType: "OTHER",
        });
        router.refresh();
        onSuccess?.();
      } else {
        const error = await res.json();
        console.error("Failed to upload document:", error);
      }
    } catch (error) {
      console.error("Failed to upload document:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!formData.title) {
        // Use filename without extension as title
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setFormData({ ...formData, title: nameWithoutExt });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="file">Document File *</Label>
        <div className="mt-1">
          <label
            htmlFor="file"
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
                <p className="text-xs text-slate-400">PDF, DOC, DOCX up to 10MB</p>
              </div>
            )}
            <input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
              required
            />
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="title">Document Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Quality Policy v2.0"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="isoElement">ISO Element *</Label>
          <Select
            value={formData.isoElement}
            onValueChange={(value: ISOElement) =>
              setFormData({ ...formData, isoElement: value })
            }
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ISO element" />
            </SelectTrigger>
            <SelectContent>
              {ISO_ELEMENTS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="documentType">Document Type *</Label>
          <Select
            value={formData.documentType}
            onValueChange={(value: DocumentType) =>
              setFormData({ ...formData, documentType: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button
          type="submit"
          disabled={isLoading || !file || !formData.isoElement}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload Document"
          )}
        </Button>
      </div>
    </form>
  );
}
