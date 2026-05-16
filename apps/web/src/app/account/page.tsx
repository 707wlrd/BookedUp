export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CalendarDays, CheckCircle2, Clock, XCircle,
  MapPin, Star, ChevronRight, AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, formatDate, formatTime, cn } from '@/lib/utils';
import { AccountTabs } from './AccountTabs';

/* ── Types ── */
type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: Status;
  price_cents: number;
  deposit_cents: number;
  customer_name: string;
  services: { name: string; duration_minutes: number } | null;
  barbers: {
    shop_name: string;
    slug: string;
    city: string | null;
    avatar_url: string | null;
  } | null;
}

/* ── Status chip config ── */
const STATUS_CFG: Record<Status, { label: string; chip: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente', chip: 'border-spark-500/30 bg-spark-500/10 text-spark-300',          icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: 'Confirmé',   chip: 'border-electric-500/30 bg-electric-500/10 text-electric-300', icon: <CheckCircle2 className="h-3 w-3" /> },
  completed: { label: 'Terminé',    chip: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',    icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Annulé',     chip: 'border-white/10 bg-white/[0.03] text-white/35',               icon: <XCircle className="h-3 w-3" /> },
  no_show:   { label: 'No-show',    chip: 'border-red-500/30 bg-red-500/10 text-red-400',                icon: <AlertCircle className="h-3 w-3" /> },
};

/* ── Avatar helper ── */
function BarberAvatar({ avatarUrl, shopName, size = 48 }: {
  avatarUrl: string | null;
  shopName: string;
  size?: number;
}) {
  const initials = shopName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={shopName}
        width={size}
        height={size}
        className="flex-none rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex flex-none items-center justify-center rounded-xl bg-electric-500/15 text-sm font-bold text-electric-300"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

/* ── Upcoming card ── */
function UpcomingCard({ appt }: { appt: Appointment }) {
  const cfg = STATUS_CFG[appt.status];
  const barber = appt.barbers;

  return (
    <div className="card card-hover p-5">
      <div className="flex items-start gap-4">
        <BarberAvatar
          avatarUrl={barber?.avatar_url ?? null}
          shopName={barber?.shop_name ?? '?'}
          size={48}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-semibold leading-tight">{barber?.shop_name ?? '—'}</div>
              {barber?.city && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-white/40">
                  <MapPin className="h-3 w-3" /> {barber.city}
                </div>
              )}
            </div>
            <span className={cn('chip text-[11px]', cfg.chip)}>
              {cfg.icon}{cfg.label}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
            <span>{appt.services?.name ?? '—'}</span>
            <span className="text-white/30">·</span>
            <span className="capitalize">{formatDate(appt.starts_at)}</span>
            <span className="text-white/30">·</span>
            <span>{formatTime(appt.starts_at)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
        <Link
          href={`/cancel/${appt.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/50 transition hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
        >
          <XCircle className="h-3.5 w-3.5" />
          Annuler
        </Link>
        {barber?.slug && (
          <Link
            href={`/barbers/${barber.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/60 transition hover:border-electric-500/30 hover:bg-electric-500/5 hover:text-electric-300"
          >
            Voir le salon
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Past card ── */
function PastCard({ appt }: { appt: Appointment }) {
  const cfg = STATUS_CFG[appt.status];
  const barber = appt.barbers;

  return (
    <div className="card p-5 opacity-80 transition hover:opacity-100">
      <div className="flex items-start gap-4">
        <BarberAvatar
          avatarUrl={barber?.avatar_url ?? null}
          shopName={barber?.shop_name ?? '?'}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-semibold leading-tight">{barber?.shop_name ?? '—'}</div>
              {barber?.city && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-white/40">
                  <MapPin className="h-3 w-3" /> {barber.city}
                </div>
              )}
            </div>
            <span className={cn('chip text-[11px]', cfg.chip)}>
              {cfg.icon}{cfg.label}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
            <span>{appt.services?.name ?? '—'}</span>
            <span className="text-white/25">·</span>
            <span className="capitalize">{formatDate(appt.starts_at)}</span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold tabular-nums text-white/70">
              {formatPrice(appt.price_cents)}
            </span>
            {appt.status === 'completed' && (
              <Link
                href={`/review/${appt.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-spark-500/30 bg-spark-500/10 px-3 py-1.5 text-[11px] font-medium text-spark-300 transition hover:bg-spark-500/20"
              >
                <Star className="h-3 w-3" />
                Laisser un avis
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ upcoming }: { upcoming: boolean }) {
  return (
    <div className="card flex flex-col items-center justify-center py-16 text-center">
      <CalendarDays className="mb-4 h-12 w-12 text-white/10" />
      <div className="text-base font-medium text-white/40">
        {upcoming ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé'}
      </div>
      {upcoming && (
        <Link
          href="/barbers"
          className="btn-electric mt-5 inline-flex items-center gap-2 text-sm"
        >
          Trouver un coiffeur
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/* ── Page ── */
export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/account');

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, starts_at, ends_at, status, price_cents, deposit_cents, customer_name, services(name, duration_minutes), barbers(shop_name, slug, city, avatar_url)')
    .eq('customer_email', user.email)
    .order('starts_at', { ascending: false });

  const now = new Date();
  const allAppts = (appointments ?? []) as unknown as Appointment[];

  const upcomingAppts = allAppts.filter(
    a => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.starts_at) > now,
  );
  const pastAppts = allAppts.filter(
    a => a.status === 'completed'
      || a.status === 'cancelled'
      || a.status === 'no_show'
      || new Date(a.starts_at) <= now,
  );

  const firstName = (user.user_metadata?.full_name as string | undefined)
    ?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'toi';

  const upcomingContent =
    upcomingAppts.length === 0
      ? <EmptyState upcoming />
      : <>{upcomingAppts.map(a => <UpcomingCard key={a.id} appt={a} />)}</>;

  const pastContent =
    pastAppts.length === 0
      ? <EmptyState upcoming={false} />
      : <>{pastAppts.map(a => <PastCard key={a.id} appt={a} />)}</>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          Bonjour{' '}
          <span className="bg-gradient-to-r from-electric-300 to-electric-500 bg-clip-text text-transparent capitalize">
            {firstName}
          </span>
        </h1>
        <p className="mt-1.5 text-sm text-white/40">{user.email}</p>
      </div>

      {/* Tabs (client) wrapping server-rendered card lists */}
      <AccountTabs
        upcoming={upcomingContent}
        past={pastContent}
      />

    </div>
  );
}
