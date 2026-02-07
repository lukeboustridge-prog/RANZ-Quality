"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Shield,
  Users,
  FileText,
  Settings,
  HelpCircle,
  ClipboardCheck,
  AlertTriangle,
  FolderKanban,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Insurance", href: "/insurance", icon: Shield },
  { name: "Staff", href: "/staff", icon: Users },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Suppliers", href: "/suppliers", icon: Package },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Audits", href: "/audits", icon: ClipboardCheck },
  { name: "CAPA", href: "/capa", icon: AlertTriangle },
];

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-slate-200 bg-white px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-slate-900">RANZ Portal</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          isActive
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-700 hover:text-blue-600 hover:bg-slate-50",
                          "group flex gap-x-3 rounded-lg p-2 text-sm font-medium leading-6"
                        )}
                      >
                        <item.icon
                          className={cn(
                            isActive
                              ? "text-blue-600"
                              : "text-slate-400 group-hover:text-blue-600",
                            "h-5 w-5 shrink-0"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
            <li className="mt-auto">
              <ul role="list" className="-mx-2 space-y-1">
                {secondaryNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          isActive
                            ? "bg-blue-50 text-blue-600"
                            : "text-slate-700 hover:text-blue-600 hover:bg-slate-50",
                          "group flex gap-x-3 rounded-lg p-2 text-sm font-medium leading-6"
                        )}
                      >
                        <item.icon
                          className={cn(
                            isActive
                              ? "text-blue-600"
                              : "text-slate-400 group-hover:text-blue-600",
                            "h-5 w-5 shrink-0"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
