"use client";

import Image from "next/image";
import {
  OrganizationSwitcher,
  UserButton,
} from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  appName: string;
  onMenuClick?: () => void;
  showOrgSwitcher?: boolean;
}

export function AppHeader({ appName, onMenuClick, showOrgSwitcher = true }: AppHeaderProps) {

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-ranz-charcoal bg-ranz-charcoal-dark px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 ranz-header">
      {/* Mobile menu button */}
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-white hover:bg-ranz-charcoal"
          onClick={onMenuClick}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      )}

      {/* Logo and App Name */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden">
          <Image
            src="/ranz-logo.svg"
            alt="RANZ Logo"
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm sm:text-base hidden sm:block">
            RANZ
          </span>
          <span className="bg-app-accent text-app-accent-foreground px-2 py-1 text-xs font-medium rounded">
            {appName}
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-ranz-charcoal-light/30 hidden sm:block" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Organization switcher */}
        {showOrgSwitcher && (
          <div className="flex items-center">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  rootBox: "flex items-center",
                  organizationSwitcherTrigger:
                    "flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20",
                },
              }}
              afterCreateOrganizationUrl="/onboarding"
              afterSelectOrganizationUrl="/dashboard"
            />
          </div>
        )}

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
  );
}
