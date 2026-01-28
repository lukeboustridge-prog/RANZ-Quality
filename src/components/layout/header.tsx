"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  OrganizationSwitcher,
  UserButton,
} from "@clerk/nextjs";
import {
  Menu,
  X,
  LayoutDashboard,
  Shield,
  Users,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Insurance", href: "/insurance", icon: Shield },
  { name: "Staff", href: "/staff", icon: Users },
  { name: "Documents", href: "/documents", icon: FileText },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>

        {/* Separator */}
        <div className="h-6 w-px bg-slate-200 lg:hidden" aria-hidden="true" />

        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          {/* Organization switcher */}
          <div className="flex items-center">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "flex items-center",
                  organizationSwitcherTrigger:
                    "flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50",
                },
              }}
              afterCreateOrganizationUrl="/onboarding"
              afterSelectOrganizationUrl="/dashboard"
            />
          </div>

          {/* Right side */}
          <div className="flex flex-1 items-center justify-end gap-x-4">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
              afterSignOutUrl="/sign-in"
            />
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/80"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </Button>
              </div>

              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">R</span>
                    </div>
                    <span className="font-semibold text-slate-900">
                      RANZ Portal
                    </span>
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
                                onClick={() => setMobileMenuOpen(false)}
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
