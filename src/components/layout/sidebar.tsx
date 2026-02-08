"use client";

import Link from "next/link";
import Image from "next/image";
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
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[var(--ranz-charcoal)] px-6 pb-4">
        {/* Logo area with diagonal accent */}
        <div className="flex h-20 shrink-0 items-center border-b border-[var(--ranz-charcoal-light)]/20 relative">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="RANZ Logo"
              width={48}
              height={48}
              className="h-12 w-auto"
              priority
              onError={(e) => {
                // Fallback if logo doesn't exist
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Fallback logo */}
            <div className="hidden h-10 w-10 rounded bg-white/10 items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-wide">
                RANZ
              </span>
              <span className="text-xs text-[var(--ranz-silver)] tracking-wider">
                QUALITY PROGRAMME
              </span>
            </div>
          </Link>
          {/* Diagonal accent */}
          <div className="absolute top-0 right-0 w-16 h-full bg-[var(--ranz-charcoal-dark)] opacity-50"
               style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
        </div>

        {/* Navigation */}
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
                          "group flex gap-x-3 rounded-md p-2.5 text-sm font-medium leading-6 transition-colors",
                          isActive
                            ? "bg-[var(--ranz-charcoal-dark)] text-white border-l-2 border-[var(--ranz-yellow)]"
                            : "text-[var(--ranz-silver)] hover:bg-[var(--ranz-charcoal-dark)] hover:text-white"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive
                              ? "text-[var(--ranz-yellow)]"
                              : "text-[var(--ranz-silver)] group-hover:text-white"
                          )}
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
                          "group flex gap-x-3 rounded-md p-2.5 text-sm font-medium leading-6 transition-colors",
                          isActive
                            ? "bg-[var(--ranz-charcoal-dark)] text-white border-l-2 border-[var(--ranz-yellow)]"
                            : "text-[var(--ranz-silver)] hover:bg-[var(--ranz-charcoal-dark)] hover:text-white"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive
                              ? "text-[var(--ranz-yellow)]"
                              : "text-[var(--ranz-silver)] group-hover:text-white"
                          )}
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
