'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, CalendarDays, CheckCircle2, Clock,
  TrendingUp, Wallet, Users, Loader2,
} from 'lucide-react';
import { StatCard } from '@/components/studio/StatCard';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';

const STATUS_CHIP: Record<string, string> = {
  confirmed: 'chip-electric',
  pending:   'chip border-spark-500/30 bg-spark-500/10 text-spark-400',
  completed: 'chip border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  cancelled: 'chip border-white/10 bg-white/[0.03] text-white/30',
  no_show:   'chip border-red-500/30 bg-red-500/10 text-red-400',
};
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmé', pending: 'En attente',
  completed: 'Terminé',  cancelled: 'Annulé', no_show: 'No-show',
};

type Appt = {
  id: string;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  status: string;
  price_cents: number;
  services: { name: string } | null;
};

type WeekAppt = { price_cents: number; deposit_cents: number; status: string };

export function DashboardLive({ barberId }: { barberId: string }) {
  const supabase = createClient();

  const [appts,    setAppts]    = useState<Appt[]>([]);
  const [week,     setWeek]     = useState<WeekAppt[]>([]);
  const [prevWeek, setPrevWeek] = useState<WeekAppt[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    const now         = new Date();
    const todayStart  = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd    = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const weekStart   = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd   = new Date(weekStart);
    prevWeekEnd.setMilliseconds(-1);

    const [{ data: todayData }, { data: weekData }, { data: prevData }] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, starts_at, ends_at, customer_name, status, price_cents, services(name)')
        .eq('barber_id', barberId)
        .gte('starts_at', todayStart.toISOString())
        .lte('starts_at', todayEnd.toISOString())
        .not('status', 'in', '("cancelled","no_show")')
        .order('starts_at'),

      supabase
        .from('appointments')
        .select('price_cents, deposit_cents, status')
        .eq('barber_id', barberId)
        .gte('starts_at', weekStart.toISOString())
        .in('status', ['confirmed', 'completed']),

      supabase
        .from('appointments')
        .select('price_cents, deposit_cents, status')
        .eq('barber_id', barberId)
        .gte('starts_at', prevWeekStart.toISOString())
        .lte('starts_at', prevWeekEnd.toISOString())
        .in('status', ['confirmed', 'completed']),
    ]);

    setAppts((todayData ?? []) as unknown as Appt[]);
    setWeek((weekData  ?? []) as unknown as WeekAppt[]);
    setPrevWeek((prevData ?? []) as unknown as WeekAppt[]);
  }, [barberId]);

  // Initial load
  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`dashboard:${barberId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `barber_id=eq.${barberId}`,
      }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [barberId, load]);

  // Computed values
  const now          = new Date();
  const todayRevenue = appts.reduce((s, a) => s + a.price_cents, 0);
  const weekRevenue  = week.reduce((s, a) => s + a.price_cents, 0);
  const prevRevenue  = prevWeek.reduce((s, a) => s + a.price_cents, 0);
  const weekDelta    = prevRevenue > 0
    ? Math.round(((weekRevenue - prevRevenue) / prevRevenue) * 100)
    : null;
  const deposits     = week.filter(a => a.deposit_cents > 0).length;
  const fillRate     = Math.min(100, Math.round((appts.length / 12) * 100));
  const nextAppt     = appts.find(a => new Date(a.starts_at) >= now) ?? appts[0] ?? null;
  const nextTime     = nextAppt
    ? new Date(nextAppt.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/30 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Chargement…</span>
      </div>
    );
  }

  return (
    <>
      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          Icon={CalendarDays}
          label="RDV du jour"
          value={String(appts.length)}
          hint={appts.length === 0 ? 'Aucun RDV' : `${appts.filter(a => a.status === 'confirmed').length} confirmés`}
        />
        <StatCard
          Icon={Wallet}
          label="Revenus du jour"
          value={formatPrice(todayRevenue)}
          highlight={todayRevenue > 0}
        />
        <StatCard
          Icon={Users}
          label="Acomptes semaine"
          value={String(deposits)}
          hint="encaissés"
        />
        <StatCard
          Icon={TrendingUp}
          label="Remplissage"
          value={`${fillRate}%`}
          delta={fillRate >= 80 ? '🔥' : undefined}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Programme du jour */}
        <section className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="font-semibold">Programme du jour</div>
            <Link href="/studio/calendar" className="arrow-slide inline-flex items-center gap-1 text-xs text-electric-300 hover:text-electric-200">
              Voir l'agenda <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {appts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <CalendarDays className="h-8 w-8 text-white/10" />
              <p className="text-sm text-white/35">Aucun rendez-vous aujourd'hui.</p>
              <Link href="/studio/calendar" className="mt-1 text-xs text-electric-400 hover:text-electric-300">
                Voir l'agenda →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {appts.map((a) => {
                const svc    = (a.services as any)?.name ?? '—';
                const time   = new Date(a.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const isPast = new Date(a.ends_at) < now;
                return (
                  <Link
                    key={a.id}
                    href={`/studio/appointments?id=${a.id}`}
                    className={cn(
                      'group flex items-center gap-4 px-6 py-3.5 transition hover:bg-white/[0.02]',
                      isPast && 'opacity-50',
                    )}
                  >
                    <div className="w-12 text-sm font-semibold tabular-nums text-white/85">{time}</div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">{a.customer_name}</div>
                      <div className="truncate text-xs text-white/40">{svc}</div>
                    </div>
                    <div className="text-sm font-bold tabular-nums">{formatPrice(a.price_cents)}</div>
                    <span className={STATUS_CHIP[a.status] ?? STATUS_CHIP.pending}>
                      {a.status === 'confirmed'
                        ? <CheckCircle2 className="h-3 w-3" />
                        : <Clock className="h-3 w-3" />}
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Right column */}
        <section className="space-y-3">

          {/* Next appointment */}
          <div className="card p-5">
            <div className="label">Prochain RDV</div>
            {nextAppt ? (
              <>
                <div className="mt-2 text-xl font-bold">
                  {nextTime} — {nextAppt.customer_name}
                </div>
                <div className="mt-1 text-xs text-white/40">
                  {(nextAppt.services as any)?.name ?? '—'}
                </div>
                <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full w-1/3 rounded-full bg-electric-500/60" />
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-white/35">Pas de RDV à venir.</div>
            )}
          </div>

          {/* Week revenue */}
          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="label">Cette semaine</div>
                <div className="mt-2 text-2xl font-bold tabular-nums">{formatPrice(weekRevenue)}</div>
              </div>
              <CalendarDays className="h-5 w-5 text-electric-300" />
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
              <span>{week.length} RDV</span>
              {weekDelta !== null && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  weekDelta >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400',
                )}>
                  {weekDelta >= 0 ? '+' : ''}{weekDelta}% vs sem. préc.
                </span>
              )}
            </div>
          </div>

        </section>
      </div>
    </>
  );
}
