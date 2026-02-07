"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CPD_TARGET = 20;

const CPD_CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: "Technical",
  PEER_REVIEW: "Peer Review",
  INDUSTRY_EVENT: "Industry Event",
  SELF_STUDY: "Self Study",
  OTHER: "Other",
};

const CPD_CATEGORY_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  TECHNICAL: {
    bg: "bg-blue-100",
    bar: "bg-blue-500",
    text: "text-blue-700",
  },
  PEER_REVIEW: {
    bg: "bg-purple-100",
    bar: "bg-purple-500",
    text: "text-purple-700",
  },
  INDUSTRY_EVENT: {
    bg: "bg-green-100",
    bar: "bg-green-500",
    text: "text-green-700",
  },
  SELF_STUDY: {
    bg: "bg-amber-100",
    bar: "bg-amber-500",
    text: "text-amber-700",
  },
  OTHER: {
    bg: "bg-slate-100",
    bar: "bg-slate-500",
    text: "text-slate-700",
  },
};

interface TrainingRecord {
  id: string;
  courseName: string;
  provider: string;
  completedAt: string;
  cpdPoints: number;
  cpdCategory: string;
  notes: string | null;
}

interface CpdProgressProps {
  memberId: string;
}

export function CpdProgress({ memberId }: CpdProgressProps) {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/staff/${memberId}/training`);
        if (!res.ok) throw new Error("Failed to fetch training records");
        const data = await res.json();
        setRecords(data);
      } catch (err) {
        console.error("Failed to fetch training records:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, [memberId]);

  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1).toISOString();

  const currentYearRecords = records.filter(
    (record) => record.completedAt >= yearStart
  );

  const totalPoints = currentYearRecords.reduce(
    (sum, record) => sum + record.cpdPoints,
    0
  );

  const progressPercent = Math.min((totalPoints / CPD_TARGET) * 100, 100);

  const categoryBreakdown = currentYearRecords.reduce<Record<string, number>>(
    (acc, record) => {
      acc[record.cpdCategory] = (acc[record.cpdCategory] || 0) + record.cpdPoints;
      return acc;
    },
    {}
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-slate-500" />
          CPD Progress {currentYear}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold text-slate-900">
              {totalPoints}
            </span>
            <span className="text-sm text-slate-500">
              / {CPD_TARGET} points this year
            </span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalPoints >= CPD_TARGET ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-xs text-slate-400 mt-1.5">
            {totalPoints >= CPD_TARGET
              ? "Target reached"
              : `${CPD_TARGET - totalPoints} point${
                  CPD_TARGET - totalPoints !== 1 ? "s" : ""
                } remaining`}
          </p>
        </div>

        {Object.keys(categoryBreakdown).length > 0 && (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              By Category
            </p>
            {Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, points]) => {
                const colors =
                  CPD_CATEGORY_COLORS[category] || CPD_CATEGORY_COLORS.OTHER;
                const categoryPercent = (points / CPD_TARGET) * 100;

                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${colors.text}`}>
                        {CPD_CATEGORY_LABELS[category] || category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {points} pt{points !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar}`}
                        style={{
                          width: `${Math.min(categoryPercent, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
