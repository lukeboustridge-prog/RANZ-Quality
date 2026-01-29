"use client";

import * as React from "react";
import { Activity, RefreshCw, LogIn, Users, XCircle, Lock, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LoginTrendChart,
  FailedAttemptsChart,
} from "@/components/admin/activity/activity-charts";
import { formatDistanceToNow } from "date-fns";

/**
 * Summary statistics from the activity API.
 */
interface ActivitySummary {
  totalLogins: number;
  uniqueActiveUsers: number;
  failedAttempts: number;
  accountLockouts: number;
  passwordResets: number;
}

/**
 * Data point for charts.
 */
interface ChartDataPoint {
  date: string;
  count: number;
}

/**
 * Top action count from the API.
 */
interface TopAction {
  action: string;
  count: number;
}

/**
 * Recent activity entry from the API.
 */
interface RecentActivityEntry {
  id: string;
  action: string;
  actorEmail: string | null;
  resourceType: string | null;
  timestamp: string;
  ipAddress: string | null;
}

/**
 * Full activity data response.
 */
interface ActivityData {
  summary: ActivitySummary;
  loginsByDay: ChartDataPoint[];
  failedByDay: ChartDataPoint[];
  topActions: TopAction[];
  recentActivity: RecentActivityEntry[];
}

/**
 * Period options for the dashboard.
 */
const periodOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

/**
 * StatCard displays a single summary statistic.
 */
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-slate-600",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className={`text-3xl font-bold ${trendColors[trend || "neutral"]}`}>
              {value.toLocaleString()}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Icon className="h-6 w-6 text-slate-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Format action name for display.
 */
function formatAction(action: string): string {
  return action.replace(/_/g, " ");
}

/**
 * Get action badge color.
 */
function getActionColor(action: string): string {
  if (action.includes("SUCCESS") || action.includes("ACTIVATED") || action.includes("UNLOCKED")) {
    return "bg-green-100 text-green-800";
  }
  if (action.includes("FAILED") || action.includes("ERROR") || action.includes("LOCKED")) {
    return "bg-red-100 text-red-800";
  }
  if (action.includes("PASSWORD") || action.includes("RESET")) {
    return "bg-yellow-100 text-yellow-800";
  }
  return "bg-slate-100 text-slate-700";
}

/**
 * AdminActivityPage provides the activity dashboard for security monitoring.
 * Shows login trends, failed attempts, and recent activity.
 */
export default function AdminActivityPage() {
  const [data, setData] = React.useState<ActivityData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState("30");

  // Fetch activity data when period changes
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/activity?days=${period}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch activity data");
      }

      const activityData = await response.json();
      setData(activityData);
    } catch (err) {
      console.error("Failed to fetch activity data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch activity data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle period change
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchData();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Activity Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Monitor login activity and security events across RANZ applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading activity data...</div>
        </div>
      )}

      {/* Dashboard content */}
      {data && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Logins"
              value={data.summary.totalLogins}
              icon={LogIn}
              trend="neutral"
            />
            <StatCard
              title="Active Users"
              value={data.summary.uniqueActiveUsers}
              icon={Users}
              trend="up"
            />
            <StatCard
              title="Failed Attempts"
              value={data.summary.failedAttempts}
              icon={XCircle}
              trend={data.summary.failedAttempts > 10 ? "down" : "neutral"}
            />
            <StatCard
              title="Account Lockouts"
              value={data.summary.accountLockouts}
              icon={Lock}
              trend={data.summary.accountLockouts > 0 ? "down" : "neutral"}
            />
            <StatCard
              title="Password Resets"
              value={data.summary.passwordResets}
              icon={Key}
              trend="neutral"
            />
          </div>

          {/* Charts row */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Login Activity Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LoginTrendChart data={data.loginsByDay} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Failed attempts chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Failed Login Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FailedAttemptsChart data={data.failedByDay} />
              </CardContent>
            </Card>

            {/* Top actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Top Actions</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topActions.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-slate-400">
                    No action data available
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.topActions.map((action, index) => (
                      <div
                        key={action.action}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-sm w-4">
                            {index + 1}.
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(
                              action.action
                            )}`}
                          >
                            {formatAction(action.action)}
                          </span>
                        </div>
                        <span className="font-medium text-slate-700">
                          {action.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-slate-400">
                  No recent activity
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.recentActivity.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500 w-20 shrink-0">
                          {formatDistanceToNow(new Date(entry.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(
                            entry.action
                          )}`}
                        >
                          {formatAction(entry.action)}
                        </span>
                        <span className="text-sm text-slate-700">
                          {entry.actorEmail || "System"}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400 font-mono">
                        {entry.ipAddress || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
