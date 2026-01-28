"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Star, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function TestimonialSubmitForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [testimonialInfo, setTestimonialInfo] = useState<{
    clientName: string;
    organizationName: string;
    projectDescription?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    rating: 0,
    title: "",
    content: "",
  });

  useEffect(() => {
    if (token) {
      fetchTestimonialInfo();
    } else {
      setError("Invalid or missing verification token");
      setLoading(false);
    }
  }, [token]);

  const fetchTestimonialInfo = async () => {
    try {
      const response = await fetch(`/api/public/testimonial?token=${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to verify token");
      }
      const data = await response.json();
      setTestimonialInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify token");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.rating === 0) {
      setError("Please select a rating");
      return;
    }

    if (formData.content.trim().length < 20) {
      setError("Please provide a more detailed testimonial (at least 20 characters)");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/public/testimonial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationToken: token,
          ...formData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit testimonial");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit testimonial");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent mx-auto" />
          <p className="mt-4 text-slate-600">Verifying your request...</p>
        </div>
      </div>
    );
  }

  if (error && !testimonialInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Unable to Verify
            </h2>
            <p className="text-slate-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Thank You!
            </h2>
            <p className="text-slate-600">
              Your testimonial has been submitted successfully. Thank you for
              taking the time to share your feedback.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Share Your Experience
          </h1>
          <p className="text-slate-600 mt-2">
            {testimonialInfo?.organizationName} has requested your feedback
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Hi {testimonialInfo?.clientName}!
            </CardTitle>
            {testimonialInfo?.projectDescription && (
              <p className="text-sm text-slate-500">
                Regarding: {testimonialInfo.projectDescription}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating */}
              <div>
                <Label className="mb-2 block">
                  How would you rate your experience? *
                </Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, rating: star })
                      }
                      className="p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition-colors",
                          star <= formData.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {formData.rating === 5 && "Excellent!"}
                  {formData.rating === 4 && "Great!"}
                  {formData.rating === 3 && "Good"}
                  {formData.rating === 2 && "Fair"}
                  {formData.rating === 1 && "Poor"}
                </p>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">
                  Headline (optional)
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Excellent service and quality workmanship"
                  maxLength={100}
                />
              </div>

              {/* Content */}
              <div>
                <Label htmlFor="content">
                  Your feedback *
                </Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Please share your experience with this business..."
                  rows={5}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  {formData.content.length}/500 characters
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Testimonial"}
              </Button>

              <p className="text-xs text-center text-slate-500">
                By submitting, you agree that your testimonial may be displayed
                publicly on RANZ member profiles.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TestimonialSubmitPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent mx-auto" />
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      }
    >
      <TestimonialSubmitForm />
    </Suspense>
  );
}
