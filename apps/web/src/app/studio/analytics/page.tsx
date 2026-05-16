'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Users, Scissors, Clock, AlertTriangle } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { cn, formatPrice } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | '12m';

type RawAppt = {
  id: string;
  starts_at: string;
  price_cents: number;
  status: string;
  customer_name: string;
  customer_email: string;
  services: { name: string } | null;
};

type DayStat    = { label: string; date: string; revenue: number; count: number };
type ServiceStat = { name: string; count: number; revenue: number };
type HourStat   = { hour: number; label: string; count: number };
type ClientStat = { name: string; email: string; visits: number; ltv: number; lastVisit: string };

type Analytics = {
  currentRevenue:  number;
  prevRevenue:     number;
  currentCount:    number;
  prevCount:       number;
  avgTicket:       number;
  noShowRate:      number;
  completedRate:   number;
  revenueByDay:    DayStat[];
  services:        ServiceStat[];
  topClients:      ClientStat[];
  popularHours:    HourStat[];
  statusBreakdown: { status: string; count: number; color: string; label: string }[];
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  confirmed:  { label: 'Confirmé',   color: '#3b82ff' },
  completed:  { label: 'Terminé',    color: '#22c55e' },
  pending:    { label: 'En attente', color: '#f59e0b' },
  cancelled:  { label: 'Annulé',     color: '#6b7280' },
  no_show:    { label: 'No-show',    color: '#ef4444' },
};

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d',  label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '3 mois' },
  { key: '12m', label: '12 mois' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function periodRange(p: Period): { start: Date; prev: Date; groupBy: 'day' | 'week' | 'month' } {
  const now = new Date();
  if (p === '7d')  return { start: sub(now, 7),   prev: sub(now, 14),  groupBy: 'day' };
  if (p === '30d') return { start: sub(now, 30),  prev: sub(now, 60),  groupBy: 'day' };
  if (p === '90d') return { start: sub(now, 90),  prev: sub(now, 180), groupBy: 'week' };
  return             { start: sub(now, 365), prev: sub(now, 730), groupBy: 'month' };
}

function sub(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() - days);
  r.setHours(0, 0, 0, 0);
  return r;
}

function dayKey(iso: string) { return iso.slice(0, 10); }
function weekKey(iso: string) {
  const d = new Date(iso);
  const mon = new Date(d);
  mon.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
  return mon.toISOString().slice(0, 10);
}
function monthKey(iso: string) { return iso.slice(0, 7); }

function dayLabel(key: string) {
  return new Date(key).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function weekLabel(key: string) {
  return `S ${new Date(key).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}
function monthLabel(key: string) {
  return new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

function delta(cur: number, prev: number) {
  if (prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const compute = useCallback(async (p: Period) => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: barber } = await supabase
      .from('barbers').select('id').eq('owner_id', user.id).single();
    if (!barber) return;

    const { start, prev: prevStart, groupBy } = periodRange(p);

    // Fetch current + previous period in one shot
    const { data: raw } = await supabase
      .from('appointments')
      .select('id, starts_at, price_cents, status, customer_name, customer_email, services(name)')
      .eq('barber_id', barber.id)
      .gte('starts_at', prevStart.toISOString())
      .order('starts_at');

    const all = (raw ?? []) as unknown as RawAppt[];
    const current = all.filter(a => new Date(a.starts_at) >= start);
    const prev    = all.filter(a => new Date(a.starts_at) < start);

    const done = (a: RawAppt) => a.status === 'completed' || a.status === 'confirmed';

    // KPIs
    const cRevenue  = current.filter(done).reduce((s, a) => s + a.price_cents, 0);
    const pRevenue  = prev.filter(done).reduce((s, a) => s + a.price_cents, 0);
    const cCount    = current.filter(done).length;
    const pCount    = prev.filter(done).length;
    const avgTicket = cCount > 0 ? Math.round(cRevenue / cCount) : 0;
    const noShows   = current.filter(a => a.status === 'no_show').length;
    const noShowRate = current.length > 0 ? (noShows / current.length) * 100 : 0;
    const completedRate = current.length > 0 ? (current.filter(a => a.status === 'completed').length / current.length) * 100 : 0;

    // Revenue by day/week/month
    const keyFn   = groupBy === 'day' ? dayKey : groupBy === 'week' ? weekKey : monthKey;
    const labelFn = groupBy === 'day' ? dayLabel : groupBy === 'week' ? weekLabel : monthLabel;

    const buckets: Record<string, { revenue: number; count: number }> = {};
    // Build empty buckets for the entire range
    const cursor = new Date(start);
    const now = new Date();
    while (cursor <= now) {
      const k = keyFn(cursor.toISOString());
      if (!buckets[k]) buckets[k] = { revenue: 0, count: 0 };
      cursor.setDate(cursor.getDate() + (groupBy === 'month' ? 28 : groupBy === 'week' ? 7 : 1));
    }
    current.filter(done).forEach(a => {
      const k = keyFn(a.starts_at);
      if (!buckets[k]) buckets[k] = { revenue: 0, count: 0 };
      buckets[k].revenue += a.price_cents;
      buckets[k].count++;
    });
    const revenueByDay: DayStat[] = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, label: labelFn(date), ...v }));

    // Services
    const svcMap: Record<string, ServiceStat> = {};
    current.filter(done).forEach(a => {
      const name = (a.services as any)?.name ?? 'Autre';
      if (!svcMap[name]) svcMap[name] = { name, count: 0, revenue: 0 };
      svcMap[name].count++;
      svcMap[name].revenue += a.price_cents;
    });
    const services = Object.values(svcMap).sort((a, b) => b.count - a.count).slice(0, 8);

    // Top clients
    const clientMap: Record<string, ClientStat> = {};
    current.filter(done).forEach(a => {
      const k = a.customer_email;
      if (!clientMap[k]) clientMap[k] = { name: a.customer_name, email: k, visits: 0, ltv: 0, lastVisit: a.starts_at };
      clientMap[k].visits++;
      clientMap[k].ltv += a.price_cents;
      if (a.starts_at > clientMap[k].lastVisit) clientMap[k].lastVisit = a.starts_at;
    });
    const topClients = Object.values(clientMap).sort((a, b) => b.ltv - a.ltv).slice(0, 8);

    // Popular hours
    const hourMap: Record<number, number> = {};
    current.filter(done).forEach(a => {
      const h = new Date(a.starts_at).getHours();
      hourMap[h] = (hourMap[h] ?? 0) + 1;
    });
    const popularHours: HourStat[] = Array.from({ length: 11 }, (_, i) => i + 9).map(h => ({
      hour: h,
      label: `${h}h`,
      count: hourMap[h] ?? 0,
    }));

    // Status breakdown
    const statusMap: Record<string, number> = {};
    current.forEach(a => { statusMap[a.status] = (statusMap[a.status] ?? 0) + 1; });
    const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({
      status, count,
      label: STATUS_META[status]?.label ?? status,
      color: STATUS_META[status]?.color ?? '#6b7280',
    })).sort((a, b) => b.count - a.count);

    setAnalytics({
      currentRevenue: cRevenue, prevRevenue: pRevenue,
      currentCount: cCount, prevCount: pCount,
      avgTicket, noShowRate, completedRate,
      revenueByDay, services, topClients, popularHours, statusBreakdown,
    });
    setLoading(false);
  }, []);

  useEffect(() => { compute(period); }, [period, compute]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-white/50">Performance de ton salon en temps réel.</p>
        </div>
        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                period === key
                  ? 'bg-electric-500 text-white shadow-glow'
                  : 'text-white/50 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : analytics ? (
        <>
          {/* ── KPI cards ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Chiffre d'affaires"
              value={formatPrice(analytics.currentRevenue)}
              delta={delta(analytics.currentRevenue, analytics.prevRevenue)}
              icon={<TrendingUp className="h-4 w-4" />}
              highlight
            />
            <KpiCard
              label="Rendez-vous"
              value={String(analytics.currentCount)}
              delta={delta(analytics.currentCount, analytics.prevCount)}
              icon={<Clock className="h-4 w-4" />}
            />
            <KpiCard
              label="Ticket moyen"
              value={formatPrice(analytics.avgTicket)}
              delta={null}
              icon={<Scissors className="h-4 w-4" />}
            />
            <KpiCard
              label="No-shows"
              value={`${analytics.noShowRate.toFixed(1)}%`}
              delta={null}
              icon={<AlertTriangle className="h-4 w-4" />}
              invertDelta
              warn={analytics.noShowRate > 5}
            />
          </div>

          {/* ── Revenue chart ── */}
          <div className="card p-6">
            <div className="mb-1 text-sm font-semibold">Revenus</div>
            <div className="mb-6 text-xs text-white/40">
              {formatPrice(analytics.currentRevenue)} sur la période sélectionnée
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.revenueByDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82ff" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `${Math.round(v / 100)}€`}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f1118', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, fontSize: 12, color: '#fff',
                  }}
                  formatter={(v: unknown) => [formatPrice(v as number), 'CA']}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                />
                <Area
                  type="monotone" dataKey="revenue"
                  stroke="#3b82ff" strokeWidth={2}
                  fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82ff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Services + Status ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Services breakdown */}
            <div className="card p-6">
              <div className="mb-4 text-sm font-semibold">Services les plus demandés</div>
              {analytics.services.length === 0 ? (
                <p className="text-sm text-white/35">Aucune donnée.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.services.map((s, i) => {
                    const max = analytics.services[0].count;
                    const pct = Math.round((s.count / max) * 100);
                    return (
                      <div key={s.name}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-medium">{s.name}</span>
                          <span className="flex-none text-white/40">
                            {s.count} RDV · {formatPrice(s.revenue)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-electric-500 transition-all duration-500"
                            style={{ width: `${pct}%`, opacity: 1 - i * 0.1 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status donut */}
            <div className="card p-6">
              <div className="mb-4 text-sm font-semibold">Répartition des statuts</div>
              {analytics.statusBreakdown.length === 0 ? (
                <p className="text-sm text-white/35">Aucune donnée.</p>
              ) : (
                <>
                  <DonutChart data={analytics.statusBreakdown} />
                  <div className="mt-4 space-y-2">
                    {analytics.statusBreakdown.map(s => (
                      <div key={s.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                          <span className="text-white/60">{s.label}</span>
                        </div>
                        <span className="font-medium">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Popular hours ── */}
          <div className="card p-6">
            <div className="mb-1 text-sm font-semibold">Créneaux les plus populaires</div>
            <div className="mb-6 text-xs text-white/40">Nombre de RDV par heure</div>
            <div className="flex items-end gap-1.5">
              {analytics.popularHours.map(h => {
                const max = Math.max(...analytics.popularHours.map(x => x.count), 1);
                const pct = Math.max(4, (h.count / max) * 100);
                return (
                  <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                    {h.count > 0 && (
                      <span className="text-[9px] text-white/40">{h.count}</span>
                    )}
                    <div
                      className="w-full rounded-t-md transition-all duration-500"
                      style={{
                        height: `${pct * 1.2}px`,
                        background: h.count > 0
                          ? `rgba(59,130,255,${0.3 + (h.count / Math.max(...analytics.popularHours.map(x => x.count), 1)) * 0.7})`
                          : 'rgba(255,255,255,0.04)',
                      }}
                    />
                    <span className="text-[10px] text-white/40">{h.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Top clients ── */}
          {analytics.topClients.length > 0 && (
            <div className="card overflow-hidden">
              <div className="border-b border-white/[0.06] p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Top clients</div>
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Users className="h-3.5 w-3.5" />
                    {analytics.topClients.length} clients
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Client', 'Email', 'Visites', 'LTV', 'Dernière visite'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-medium text-white/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topClients.map((c, i) => (
                      <tr key={c.email} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-electric-500/15 text-[11px] font-bold text-electric-300">
                              {c.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium">{c.name}</span>
                            {i === 0 && <span className="rounded-full bg-spark-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-spark-400">Top</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-white/50">{c.email}</td>
                        <td className="px-5 py-3 tabular-nums">{c.visits}</td>
                        <td className="px-5 py-3 font-semibold text-electric-300 tabular-nums">{formatPrice(c.ltv)}</td>
                        <td className="px-5 py-3 text-white/50">
                          {new Date(c.lastVisit).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {analytics.currentCount === 0 && (
            <div className="card p-16 text-center text-white/40">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">Aucune donnée pour cette période</p>
              <p className="mt-1 text-sm">Les stats apparaîtront dès tes premiers RDV.</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────

function KpiCard({
  label, value, delta: d, icon, highlight, invertDelta, warn,
}: {
  label: string; value: string; delta: number | null;
  icon: React.ReactNode; highlight?: boolean; invertDelta?: boolean; warn?: boolean;
}) {
  const positive = d !== null && (invertDelta ? d < 0 : d > 0);
  const negative = d !== null && (invertDelta ? d > 0 : d < 0);

  return (
    <div className={cn(
      'card p-5 transition',
      highlight && 'border-electric-500/25 bg-electric-500/[0.05]',
      warn && 'border-red-500/20 bg-red-500/[0.04]',
    )}>
      <div className={cn(
        'mb-3 flex h-8 w-8 items-center justify-center rounded-xl',
        highlight ? 'bg-electric-500/15 text-electric-300' : warn ? 'bg-red-500/15 text-red-400' : 'bg-white/[0.06] text-white/60',
      )}>
        {icon}
      </div>
      <div className="text-xs text-white/45">{label}</div>
      <div className={cn('mt-1 text-2xl font-bold tracking-tight', highlight && 'text-electric-200')}>{value}</div>
      {d !== null && (
        <div className={cn(
          'mt-2 flex items-center gap-1 text-xs font-medium',
          positive && 'text-emerald-400',
          negative && 'text-red-400',
          !positive && !negative && 'text-white/40',
        )}>
          {positive ? <TrendingUp className="h-3 w-3" /> : negative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {d > 0 ? '+' : ''}{d}% vs période préc.
        </div>
      )}
    </div>
  );
}

// ── Donut chart (pure SVG, no lib dependency) ─────────────────────────────

function DonutChart({ data }: { data: { count: number; color: string; label: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  const R = 60, CX = 80, CY = 70, strokeW = 20;
  const circ = 2 * Math.PI * R;

  let offset = 0;
  const segments = data.map(d => {
    const pct = d.count / total;
    const seg = { ...d, pct, dasharray: `${pct * circ} ${circ}`, dashoffset: -offset * circ };
    offset += pct;
    return seg;
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={160} height={140} className="flex-none">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeW} />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeW}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        ))}
        <text x={CX} y={CY - 4} textAnchor="middle" fill="white" fontSize={18} fontWeight="bold">{total}</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10}>total</text>
      </svg>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-white/[0.04]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-2xl bg-white/[0.04]" />
        <div className="h-64 rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  );
}
