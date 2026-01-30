"use client";

import { UserProfile } from '@clerk/nextjs';

export function UserProfileSection() {
  return (
    <div className="clerk-user-profile-wrapper">
      <UserProfile
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border border-gray-200 rounded-lg',
            navbar: 'hidden',
            pageScrollBox: 'p-0',
          },
          variables: {
            colorPrimary: '#2563eb',
          }
        }}
      />
    </div>
  );
}
