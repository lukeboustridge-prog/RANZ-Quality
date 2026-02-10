"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Shield,
  Users,
  UsersRound,
  FileText,
  Settings,
  ClipboardCheck,
  ClipboardList,
  AlertTriangle,
  FolderKanban,
  Package,
  Award,
  GraduationCap,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { name: string; href: string; icon: typeof LayoutDashboard };
type NavGroup = { name: string; icon: typeof LayoutDashboard; children: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const navigation: NavEntry[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Insurance", href: "/insurance", icon: Shield },
  {
    name: "People",
    icon: Users,
    children: [
      { name: "Staff", href: "/staff", icon: Users },
      { name: "Teams", href: "/teams", icon: UsersRound },
      { name: "Credentials", href: "/credentials", icon: GraduationCap },
    ],
  },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Suppliers", href: "/suppliers", icon: Package },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Audits", href: "/audits", icon: ClipboardCheck },
  { name: "CAPA", href: "/capa", icon: AlertTriangle },
  { name: "Programme", href: "/programme", icon: Award },
  { name: "Checklists", href: "/checklists", icon: ClipboardList },
];

const secondaryNavigation = [
  { name: "Help", href: "/help", icon: HelpCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const userRole = (user?.publicMetadata as { role?: string })?.role;
  const isRanzAdmin = userRole === "ranz:admin" || userRole === "ranz:auditor";

  // Auto-expand groups when a child route is active
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const entry of navigation) {
      if (isNavGroup(entry)) {
        initial[entry.name] = false; // will be overridden by active check below
      }
    }
    return initial;
  });

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const isRouteActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const isGroupActive = (group: NavGroup) =>
    group.children.some((child) => isRouteActive(child.href));

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
                {navigation.map((entry) => {
                  if (isNavGroup(entry)) {
                    const groupActive = isGroupActive(entry);
                    const isExpanded = expandedGroups[entry.name] || groupActive;
                    return (
                      <li key={entry.name}>
                        <button
                          onClick={() => toggleGroup(entry.name)}
                          className={cn(
                            "group flex w-full items-center gap-x-3 rounded-md p-2.5 text-sm font-medium leading-6 transition-all duration-150",
                            groupActive
                              ? "bg-[var(--ranz-charcoal-dark)] text-white"
                              : "text-[var(--ranz-silver)] hover:bg-[var(--ranz-charcoal-dark)] hover:text-white"
                          )}
                        >
                          <entry.icon
                            className={cn(
                              "h-5 w-5 shrink-0",
                              groupActive
                                ? "text-[var(--ranz-yellow)]"
                                : "text-[var(--ranz-silver)] group-hover:text-white"
                            )}
                          />
                          {entry.name}
                          <ChevronRight
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0 transition-transform duration-150",
                              isExpanded ? "rotate-90" : "",
                              groupActive
                                ? "text-[var(--ranz-yellow)]"
                                : "text-[var(--ranz-silver)] group-hover:text-white"
                            )}
                          />
                        </button>
                        {isExpanded && (
                          <ul role="list" className="mt-1 space-y-1 pl-4">
                            {entry.children.map((child) => {
                              const isActive = isRouteActive(child.href);
                              return (
                                <li key={child.name}>
                                  <Link
                                    href={child.href}
                                    className={cn(
                                      "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-all duration-150",
                                      isActive
                                        ? "bg-[var(--ranz-charcoal-dark)] text-white border-l-2 border-[var(--ranz-yellow)]"
                                        : "text-[var(--ranz-silver)] hover:bg-[var(--ranz-charcoal-dark)] hover:text-white"
                                    )}
                                  >
                                    <child.icon
                                      className={cn(
                                        "h-4 w-4 shrink-0",
                                        isActive
                                          ? "text-[var(--ranz-yellow)]"
                                          : "text-[var(--ranz-silver)] group-hover:text-white"
                                      )}
                                    />
                                    {child.name}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  }

                  const isActive = isRouteActive(entry.href);
                  return (
                    <li key={entry.name}>
                      <Link
                        href={entry.href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2.5 text-sm font-medium leading-6 transition-all duration-150",
                          isActive
                            ? "bg-[var(--ranz-charcoal-dark)] text-white border-l-2 border-[var(--ranz-yellow)]"
                            : "text-[var(--ranz-silver)] hover:bg-[var(--ranz-charcoal-dark)] hover:text-white"
                        )}
                      >
                        <entry.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive
                              ? "text-[var(--ranz-yellow)]"
                              : "text-[var(--ranz-silver)] group-hover:text-white"
                          )}
                        />
                        {entry.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
            {/* Administration - only for RANZ admins/auditors */}
            {isRanzAdmin && (
              <li>
                <div className="text-xs font-semibold leading-6 text-[var(--ranz-silver)] uppercase tracking-wider">
                  Administration
                </div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  <li>
                    <Link
                      href="/admin"
                      className={cn(
                        "group flex gap-x-3 rounded-md p-2.5 text-sm font-medium leading-6 transition-all duration-150",
                        pathname.startsWith("/admin")
                          ? "bg-[var(--ranz-charcoal-dark)] text-white border-l-2 border-[var(--ranz-yellow)]"
                          : "text-[var(--ranz-silver)] hover:bg-[var(--ranz-charcoal-dark)] hover:text-white"
                      )}
                    >
                      <Shield
                        className={cn(
                          "h-5 w-5 shrink-0",
                          pathname.startsWith("/admin")
                            ? "text-[var(--ranz-yellow)]"
                            : "text-[var(--ranz-silver)] group-hover:text-white"
                        )}
                      />
                      Admin Portal
                    </Link>
                  </li>
                </ul>
              </li>
            )}

            <li className="mt-auto">
              <ul role="list" className="-mx-2 space-y-1">
                {secondaryNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2.5 text-sm font-medium leading-6 transition-all duration-150",
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
