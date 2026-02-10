"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Award, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProgrammeApplyPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/programme/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message || undefined }),
      });

      if (res.status === 409) {
        setError(
          "Your organisation already has an active or pending programme enrolment."
        );
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "An error occurred. Please try again.");
        return;
      }

      router.push("/programme");
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/programme"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Programme
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          Apply to Enrol
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Submit your application to join the RoofWright programme
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[var(--ranz-charcoal)]" />
            Enrolment Application
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organisation Name</Label>
              <Input
                id="orgName"
                value={organization?.name || ""}
                disabled
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Message (optional)
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us why your organisation would like to join the RoofWright programme..."
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-slate-400">
                {message.length}/500 characters
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
              <Link href="/programme">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
