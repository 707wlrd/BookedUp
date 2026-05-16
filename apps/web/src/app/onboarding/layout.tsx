import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

/** Standalone layout — no studio sidebar, no nav. */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[rgb(5,6,8)]">
      {children}
    </div>
  );
}
