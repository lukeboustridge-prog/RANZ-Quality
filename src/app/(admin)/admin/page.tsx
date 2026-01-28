"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  AlertTriangle,
  Shield,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Stats {
  organizations: {
    total: number;
    byTier: {
      ACCREDITED: number;
      CERTIFIED: number;
      MASTER_ROOFER: number;
    };
    compliance: {
      average: number;
      compliant: number;
      atRisk: number;
      critical: number;
    };
  };
  insurance: {
    expiringNext30Days: number;
  };
  capa: {
    open: number;
    overdue: number;
  };
  audits: {
    upcoming: number;
    recentlyCompleted: number;
  };
  personnel: {
    unverifiedLBP: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-slate-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Failed to load statistics</p>
      </div>
    );
  }

  const compliancePercentage =
    stats.organizations.total > 0
      ? Math.round(
          (stats.organizations.compliance.compliant /
            stats.organizations.total) *
            100
        )
      : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500">
          Overview of all RANZ certified businesses
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Members</p>
                <p className="text-3xl font-bold">{stats.organizations.total}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {stats.organizations.byTier.MASTER_ROOFER} Master Roofers
                </p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Avg Compliance</p>
                <p className="text-3xl font-bold">
                  {stats.organizations.compliance.average}%
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {compliancePercentage}% fully compliant
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Open CAPAs</p>
                <p className="text-3xl font-bold">{stats.capa.open}</p>
                <p className="text-xs text-red-500 mt-1">
                  {stats.capa.overdue} overdue
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Upcoming Audits</p>
                <p className="text-3xl font-bold">{stats.audits.upcoming}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Next 30 days
                </p>
              </div>
              <Calendar className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Overview & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compliance Status */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Compliant */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Compliant (90%+)</p>
                    <p className="text-sm text-slate-500">
                      Meeting all requirements
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {stats.organizations.compliance.compliant}
                </span>
              </div>

              {/* At Risk */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">At Risk (70-89%)</p>
                    <p className="text-sm text-slate-500">
                      Attention needed
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-yellow-600">
                  {stats.organizations.compliance.atRisk}
                </span>
              </div>

              {/* Critical */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">Critical (&lt;70%)</p>
                    <p className="text-sm text-slate-500">
                      Immediate action required
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-red-600">
                  {stats.organizations.compliance.critical}
                </span>
              </div>

              <div className="pt-4">
                <Link href="/admin/members?status=critical">
                  <Button variant="outline" className="w-full">
                    View Critical Members
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts & Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.insurance.expiringNext30Days > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                  <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">
                      Expiring Insurance
                    </p>
                    <p className="text-sm text-yellow-700">
                      {stats.insurance.expiringNext30Days} policies expire in
                      the next 30 days
                    </p>
                  </div>
                </div>
              )}

              {stats.capa.overdue > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Overdue CAPAs</p>
                    <p className="text-sm text-red-700">
                      {stats.capa.overdue} corrective actions are past due
                    </p>
                  </div>
                </div>
              )}

              {stats.personnel.unverifiedLBP > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">
                      Unverified LBP
                    </p>
                    <p className="text-sm text-orange-700">
                      {stats.personnel.unverifiedLBP} staff have unverified LBP
                      credentials
                    </p>
                  </div>
                </div>
              )}

              {stats.insurance.expiringNext30Days === 0 &&
                stats.capa.overdue === 0 &&
                stats.personnel.unverifiedLBP === 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">
                        All Systems Healthy
                      </p>
                      <p className="text-sm text-green-700">
                        No urgent actions required
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Certification Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-3xl font-bold text-slate-900">
                {stats.organizations.byTier.ACCREDITED}
              </p>
              <p className="text-sm text-slate-500 mt-1">Accredited</p>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-600 rounded-full"
                  style={{
                    width: `${(stats.organizations.byTier.ACCREDITED / stats.organizations.total) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-900">
                {stats.organizations.byTier.CERTIFIED}
              </p>
              <p className="text-sm text-blue-700 mt-1">Certified</p>
              <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{
                    width: `${(stats.organizations.byTier.CERTIFIED / stats.organizations.total) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-3xl font-bold text-amber-900">
                {stats.organizations.byTier.MASTER_ROOFER}
              </p>
              <p className="text-sm text-amber-700 mt-1">Master Roofer</p>
              <div className="mt-2 h-2 bg-amber-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-600 rounded-full"
                  style={{
                    width: `${(stats.organizations.byTier.MASTER_ROOFER / stats.organizations.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
