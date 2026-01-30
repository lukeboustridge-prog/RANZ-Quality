"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardCheck,
  BarChart3,
  Settings,
  ArrowLeft,
  Shield,
  FileText,
  Activity,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Only use NEXT_PUBLIC_ variable for client components to avoid hydration mismatch
const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE || 'clerk';

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: UserCog },
  { name: "Members", href: "/admin/members", icon: Users },
  { name: "Audits", href: "/admin/audits", icon: ClipboardCheck },
  { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
  { name: "Activity", href: "/admin/activity", icon: Activity },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch by waiting for client mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top header */}
      <header className="bg-slate-900 text-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to Portal</span>
            </Link>
            <div className="h-6 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="font-semibold">RANZ Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="h-6 w-px bg-slate-700" />
            {/* Only render auth UI after mount to prevent hydration mismatch */}
            {mounted ? (
              AUTH_MODE === 'clerk' ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <button
                  onClick={() => {
                    fetch('/api/auth/logout', { method: 'POST' })
                      .then(() => window.location.href = '/sign-in');
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              )
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
