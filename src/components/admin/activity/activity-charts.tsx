"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format } from "date-fns";

/**
 * Data point for charts.
 */
interface ChartDataPoint {
  date: string;
  count: number;
}

interface LoginTrendChartProps {
  data: ChartDataPoint[];
}

interface FailedAttemptsChartProps {
  data: ChartDataPoint[];
}

/**
 * Format date for chart axis display.
 */
function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), "MMM d");
  } catch {
    return dateString;
  }
}

/**
 * Tooltip payload type.
 */
interface TooltipPayloadItem {
  value?: number;
  name?: string;
}

/**
 * Custom tooltip component for login charts.
 */
function CustomTooltip({
  active,
  payload,
  label,
  valueLabel,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  valueLabel: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        padding: "8px 12px",
      }}
    >
      <p className="text-sm text-slate-600">
        {label ? format(new Date(label), "PPP") : ""}
      </p>
      <p className="text-sm font-medium">
        {valueLabel}: {payload[0]?.value?.toLocaleString() ?? 0}
      </p>
    </div>
  );
}

/**
 * LoginTrendChart displays daily login success counts over time.
 */
export function LoginTrendChart({ data }: LoginTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-400">
        No login data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#cbd5e1" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#cbd5e1" }}
          allowDecimals={false}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <CustomTooltip
              active={active}
              payload={payload as TooltipPayloadItem[]}
              label={label as string}
              valueLabel="Logins"
            />
          )}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, stroke: "#3b82f6", strokeWidth: 2 }}
          name="Logins"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * FailedAttemptsChart displays daily failed login attempts.
 */
export function FailedAttemptsChart({ data }: FailedAttemptsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-slate-400">
        No failed attempts data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#cbd5e1" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={{ stroke: "#cbd5e1" }}
          allowDecimals={false}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <CustomTooltip
              active={active}
              payload={payload as TooltipPayloadItem[]}
              label={label as string}
              valueLabel="Failed Attempts"
            />
          )}
        />
        <Bar
          dataKey="count"
          fill="#ef4444"
          radius={[4, 4, 0, 0]}
          name="Failed"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
