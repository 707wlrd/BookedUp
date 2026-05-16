'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CalendarDays, Users, Scissors,
  CreditCard, BarChart3, Settings, Sparkles, Calendar as CalIcon, UserRound, Star,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { UserMenu } from '@/components/studio/UserMenu';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/studio',              label: 'Aperçu',         Icon: LayoutDashboard },
  { href: '/studio/calendar',     label: 'Calendrier',     Icon: CalIcon },
  { href: '/studio/appointments', label: 'Rendez-vous',    Icon: CalendarDays },
  { href: '/studio/clients',      label: 'Clients',        Icon: Users },
  { href: '/studio/services',     label: 'Services',       Icon: Scissors },
  { href: '/studio/stylists',     label: 'Coiffeurs',      Icon: UserRound },
  { href: '/studio/payments',     label: 'Paiements',      Icon: CreditCard },
  { href: '/studio/analytics',    label: 'Statistiques',   Icon: BarChart3 },
  { href: '/studio/reviews',      label: 'Avis clients',   Icon: Star },
  { href: '/studio/ai',           label: 'AI Studio',      Icon: Sparkles, badge: 'New' },
  { href: '/studio/settings',     label: 'Paramètres',     Icon: Settings },
];

interface Props {
  userEmail: string;
  userName: string;
  shopName: string;
  plan: string;
}

export function StudioSidebar({ userEmail, userName, shopName, plan }: Props) {
  const path = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col border-r border-white/[0.06] bg-ink-900/60 backdrop-blur-xl md:flex">
      <div className="p-6">
        <Logo />
        <div className="mt-3 truncate text-xs text-white/35">{shopName}</div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {ITEMS.map(({ href, label, Icon, badge }) => {
          const active = href === '/studio' ? path === '/studio' : path?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150',
                active
                  ? 'bg-electric-500/[0.12] text-white'
                  : 'text-white/55 hover:bg-white/[0.04] hover:text-white',
              )}
            >
              {active && (
                <span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-electric-400" />
              )}
              <span className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4 transition', active ? 'text-electric-300' : 'group-hover:text-white/80')} />
                {label}
              </span>
              {badge && (
                <span className="rounded-full bg-spark-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-spark-400">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Plan card */}
      <div className="border-t border-white/[0.06] p-4 space-y-3">
        <div className="card p-4 text-xs">
          <div className="flex items-center justify-between">
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              plan === 'pro' || plan === 'premium'
                ? 'bg-electric-500/20 text-electric-300 border border-electric-500/30'
                : 'bg-white/[0.06] text-white/40 border border-white/10',
            )}>
              Plan {plan === 'free' ? 'Gratuit' : plan === 'pro' ? 'Pro' : 'Premium'}
            </span>
            {plan === 'free' && (
              <Link href="/studio/settings#billing" className="text-[10px] text-spark-400 hover:text-spark-300">
                Passer Pro →
              </Link>
            )}
          </div>
          {plan !== 'free' && (
            <>
              <div className="mt-2 text-white/35">Renouvellement automatique.</div>
              <Link
                href="/studio/settings#billing"
                className="arrow-slide mt-2 inline-flex items-center gap-1 text-electric-300 hover:text-electric-200"
              >
                Gérer →
              </Link>
            </>
          )}
        </div>

        {/* User menu */}
        <UserMenu email={userEmail} name={userName} />
      </div>
    </aside>
  );
}
