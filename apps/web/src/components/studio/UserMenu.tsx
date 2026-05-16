'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronUp, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  email: string;
  name: string;
}

export function UserMenu({ email, name }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function logout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="relative">
      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <div className="text-sm font-semibold truncate">{name}</div>
              <div className="text-xs text-white/40 truncate">{email}</div>
            </div>
            <button
              onClick={logout}
              disabled={loading}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {loading ? 'Déconnexion…' : 'Se déconnecter'}
            </button>
          </div>
        </>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150',
          open ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]',
        )}
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-electric-500/20 text-xs font-bold text-electric-300">
          {initials || <User className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-medium text-white/90">{name || 'Mon compte'}</div>
          <div className="truncate text-[11px] text-white/35">{email}</div>
        </div>
        <ChevronUp className={cn('h-4 w-4 flex-none text-white/30 transition', open ? 'rotate-180' : '')} />
      </button>
    </div>
  );
}
