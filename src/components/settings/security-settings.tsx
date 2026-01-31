"use client";

import { UserProfile } from '@clerk/nextjs';

export function SecuritySettings() {
  return (
    <div className="clerk-security-wrapper">
      <UserProfile
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border border-gray-200 rounded-lg',
            pageScrollBox: 'p-0',
            // Show navbar for Security/Account navigation
            navbar: 'border-b border-gray-200 mb-4',
            navbarButton: 'text-gray-600 hover:text-gray-900',
            navbarButtonActive: 'text-blue-600 border-b-2 border-blue-600',
          },
          variables: {
            colorPrimary: '#2563eb',
          }
        }}
        // Hash routing allows internal navigation within component
        routing="hash"
      />
    </div>
  );
}
