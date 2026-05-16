import type { ReactNode } from 'react';

/** Standalone layout — no studio sidebar, no nav. */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[rgb(5,6,8)]">
      {children}
    </div>
  );
}
