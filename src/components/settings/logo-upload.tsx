"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface LogoUploadProps {
  currentLogoUrl: string | null;
  onLogoChange?: (newLogoUrl: string | null) => void;
}

export function LogoUpload({ currentLogoUrl }: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be under 2MB");
      return;
    }

    // Validate file type
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Logo must be PNG, JPEG, or WebP");
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/organizations/current/logo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      // Refresh the page to get new signed URL
      // In production, you might want to return the signed URL from the API
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(currentLogoUrl); // Revert preview
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-start gap-6">
      <div className="flex-shrink-0">
        <div
          className={`w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 ${
            isUploading ? "opacity-50" : ""
          }`}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Company logo"
              width={96}
              height={96}
              className="w-full h-full object-contain"
            />
          ) : (
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-700">Company Logo</h3>
        <p className="text-sm text-gray-500 mt-1">
          PNG, JPEG, or WebP. Max 2MB. Displayed on your profile and reports.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={handleClick}
          disabled={isUploading}
          className="mt-3 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : previewUrl ? "Change Logo" : "Upload Logo"}
        </button>

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
