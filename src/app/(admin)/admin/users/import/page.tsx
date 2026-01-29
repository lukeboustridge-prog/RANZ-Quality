"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import {
  ArrowLeft,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthUserType } from "@prisma/client";

/**
 * CSV row structure for preview.
 */
interface CSVPreviewRow {
  email: string;
  firstname: string;
  lastname: string;
  usertype: string;
  companyname?: string;
  phone?: string;
}

/**
 * Validation result for a single row.
 */
interface RowValidation {
  row: number;
  valid: boolean;
  errors: string[];
  data: CSVPreviewRow;
}

/**
 * Import result from API.
 */
interface ImportResult {
  success: boolean;
  error?: string;
  errors?: Array<{ row: number; field: string; message: string }>;
  imported?: number;
  emailsSent?: number;
  emailErrors?: Array<{ email: string; error: string }>;
}

/**
 * Validate email format.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate userType against enum.
 */
function isValidUserType(userType: string): boolean {
  return Object.values(AuthUserType).includes(userType.toUpperCase() as AuthUserType);
}

/**
 * AdminUsersImportPage provides CSV upload functionality for bulk user creation.
 * Features drag-and-drop upload, preview table, and validation status.
 */
export default function AdminUsersImportPage() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewData, setPreviewData] = React.useState<RowValidation[]>([]);
  const [parseErrors, setParseErrors] = React.useState<Papa.ParseError[]>([]);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);

  // Calculate validation summary
  const validRows = previewData.filter((r) => r.valid);
  const invalidRows = previewData.filter((r) => !r.valid);
  const totalRows = previewData.length;

  /**
   * Validate a single CSV row.
   */
  const validateRow = (row: CSVPreviewRow, rowNum: number, seenEmails: Set<string>): RowValidation => {
    const errors: string[] = [];

    // Validate email
    const email = row.email?.trim().toLowerCase();
    if (!email) {
      errors.push("Email is required");
    } else if (!isValidEmail(email)) {
      errors.push("Invalid email format");
    } else if (seenEmails.has(email)) {
      errors.push("Duplicate email in file");
    }
    if (email) seenEmails.add(email);

    // Validate firstName
    if (!row.firstname?.trim()) {
      errors.push("First name is required");
    }

    // Validate lastName
    if (!row.lastname?.trim()) {
      errors.push("Last name is required");
    }

    // Validate userType
    const userType = row.usertype?.trim().toUpperCase();
    if (!userType) {
      errors.push("User type is required");
    } else if (!isValidUserType(userType)) {
      errors.push(`Invalid user type: ${row.usertype}`);
    }

    // Validate company for member types
    const companyRequiredTypes = ["MEMBER_COMPANY_ADMIN", "MEMBER_COMPANY_USER"];
    if (companyRequiredTypes.includes(userType) && !row.companyname?.trim()) {
      errors.push("Company name required for member user types");
    }

    return {
      row: rowNum,
      valid: errors.length === 0,
      errors,
      data: row,
    };
  };

  /**
   * Handle file selection from input or drop.
   */
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setImportResult(null);
    setParseErrors([]);

    Papa.parse<CSVPreviewRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseErrors(results.errors);
          setPreviewData([]);
          return;
        }

        const seenEmails = new Set<string>();
        const validatedRows = results.data.map((row, index) =>
          validateRow(row, index + 2, seenEmails) // +2 for 1-indexed + header row
        );

        setPreviewData(validatedRows);
      },
    });
  };

  /**
   * Handle drag events.
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle file input change.
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Download CSV template.
   */
  const handleDownloadTemplate = () => {
    const template = `email,firstName,lastName,userType,companyName,phone
john.smith@example.com,John,Smith,RANZ_STAFF,,+64 21 123 4567
jane.doe@company.co.nz,Jane,Doe,MEMBER_COMPANY_ADMIN,Example Roofing Ltd,+64 21 987 6543
`;
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "user-import-template.csv");
  };

  /**
   * Submit import to API.
   */
  const handleImport = async () => {
    if (!selectedFile || validRows.length === 0) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/admin/users/import", {
        method: "POST",
        body: formData,
      });

      const result: ImportResult = await response.json();

      setImportResult(result);

      if (result.success) {
        // Clear file and preview after successful import
        setTimeout(() => {
          router.push("/admin/users");
        }, 2000);
      }
    } catch (error) {
      setImportResult({
        success: false,
        error: "Failed to connect to server",
      });
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Clear selected file and reset state.
   */
  const handleClear = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setParseErrors([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import Users from CSV</h1>
        <p className="text-slate-500 mt-1">
          Upload a CSV file to bulk create user accounts. All users will receive welcome emails with
          activation links.
        </p>
      </div>

      {/* File upload zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center justify-between">
            <span>Upload CSV File</span>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : selectedFile
                ? "border-green-300 bg-green-50"
                : "border-slate-300 hover:border-slate-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="h-12 w-12 mx-auto text-green-600" />
                <p className="text-slate-900 font-medium">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-slate-400" />
                <div>
                  <p className="text-slate-600">Drag and drop a CSV file here, or</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Maximum 100 users per import. CSV columns: email, firstName, lastName, userType,
                  companyName (optional), phone (optional)
                </p>
              </div>
            )}
          </div>

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                CSV Parsing Errors
              </h4>
              <ul className="mt-2 text-sm text-red-600 space-y-1">
                {parseErrors.map((err, i) => (
                  <li key={i}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview table */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Preview{" "}
              <span className="text-slate-500 font-normal">
                (showing {Math.min(10, totalRows)} of {totalRows} rows)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Validation summary */}
            <div className="mb-4 flex gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-green-700">{validRows.length} valid</span>
              </div>
              {invalidRows.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">{invalidRows.length} with errors</span>
                </div>
              )}
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 text-left font-medium text-slate-600 w-12">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">First Name</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Last Name</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">User Type</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Company</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((row) => (
                    <tr
                      key={row.row}
                      className={`border-b border-slate-100 ${
                        !row.valid ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{row.data.email || "-"}</td>
                      <td className="px-3 py-2">{row.data.firstname || "-"}</td>
                      <td className="px-3 py-2">{row.data.lastname || "-"}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.data.usertype?.toUpperCase() || "-"}
                      </td>
                      <td className="px-3 py-2">{row.data.companyname || "-"}</td>
                      <td className="px-3 py-2">
                        {row.errors.length > 0 && (
                          <span className="text-xs text-red-600">{row.errors.join("; ")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalRows > 10 && (
              <p className="mt-4 text-sm text-slate-500 text-center">
                ... and {totalRows - 10} more rows
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import result */}
      {importResult && (
        <Card>
          <CardContent className="pt-6">
            {importResult.success ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Import Successful
                </h4>
                <p className="mt-2 text-sm text-green-600">
                  {importResult.imported} users imported. {importResult.emailsSent} welcome emails
                  sent.
                </p>
                {importResult.emailErrors && importResult.emailErrors.length > 0 && (
                  <p className="mt-1 text-sm text-amber-600">
                    {importResult.emailErrors.length} email(s) failed to send.
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-500">Redirecting to user list...</p>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-700 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Import Failed
                </h4>
                {importResult.error && (
                  <p className="mt-2 text-sm text-red-600">{importResult.error}</p>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <ul className="mt-2 text-sm text-red-600 space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.field} - {err.message}
                      </li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>... and {importResult.errors.length - 10} more errors</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {previewData.length > 0 && !importResult?.success && (
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleClear}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || validRows.length === 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {validRows.length} Users
              </>
            )}
          </Button>
        </div>
      )}

      {/* Info card */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <h4 className="font-medium text-slate-700">CSV Format Requirements</h4>
          <ul className="mt-2 text-sm text-slate-600 space-y-1">
            <li>
              <strong>Required columns:</strong> email, firstName, lastName, userType
            </li>
            <li>
              <strong>Optional columns:</strong> companyName, phone
            </li>
            <li>
              <strong>Valid user types:</strong> {Object.values(AuthUserType).join(", ")}
            </li>
            <li>
              <strong>Company name:</strong> Required for MEMBER_COMPANY_ADMIN and
              MEMBER_COMPANY_USER types. Must match an existing company in the system.
            </li>
            <li>
              <strong>Maximum:</strong> 100 users per import
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
