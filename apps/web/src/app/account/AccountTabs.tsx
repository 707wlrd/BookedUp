'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AccountTabsProps {
  upcoming: React.ReactNode;
  past: React.ReactNode;
}

export function AccountTabs({ upcoming, past }: AccountTabsProps) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const tabs = [
    { key: 'upcoming' as const, label: 'À venir' },
    { key: 'past'     as const, label: 'Passés'  },
  ];

  return (
    <>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-white/[0.07] text-white shadow-sm'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {tab === 'upcoming' ? upcoming : past}
      </div>
    </>
  );
}
