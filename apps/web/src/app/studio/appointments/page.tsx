'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, Clock, CalendarDays,
  Loader2, ChevronDown, User, Euro, AlertCircle, RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/studio/StatCard';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';

/* ── Types ── */
type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

interface Appt {
  id: string;
  starts_at: string;
  ends_at: string;
  status: Status;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  price_cents: number;
  deposit_cents: number;
  payment_status: string;
  recurring_series_id: string | null;
  services: { name: string; duration_minutes: number } | null;
}

/* ── Status config ── */
const STATUS_CFG: Record<Status, { label: string; chip: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente', chip: 'border-spark-500/30 bg-spark-500/10 text-spark-300',         icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: 'Confirmé',   chip: 'border-electric-500/30 bg-electric-500/10 text-electric-300', icon: <CheckCircle2 className="h-3 w-3" /> },
  completed: { label: 'Terminé',    chip: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',    icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Annulé',     chip: 'border-white/10 bg-white/[0.03] text-white/35',               icon: <XCircle className="h-3 w-3" /> },
  no_show:   { label: 'No-show',    chip: 'border-red-500/30 bg-red-500/10 text-red-400',                icon: <AlertCircle className="h-3 w-3" /> },
};

const TABS: { key: 'all' | Status; label: string }[] = [
  { key: 'all',       label: 'Tous' },
  { key: 'pending',   label: 'En attente' },
  { key: 'confirmed', label: 'Confirmés' },
  { key: 'completed', label: 'Terminés' },
  { key: 'cancelled', label: 'Annulés' },
  { key: 'no_show',   label: 'No-show' },
];

const PAGE_SIZE = 20;

export default function AppointmentsPage() {
  const supabase = createClient();
  const [barberId, setBarberId]   = useState<string | null>(null);
  const [appts, setAppts]         = useState<Appt[]>([]);
  const [counts, setCounts]       = useState<Record<string, number>>({});
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(false);
  const [tab, setTab]             = useState<'all' | Status>('all');
  const [query, setQuery]         = useState('');
  const [page, setPage]           = useState(0);
  const [updating, setUpdating]   = useState<string | null>(null);

  /* ── Load barber ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('barbers').select('id').eq('owner_id', user.id).single()
        .then(({ data }) => data && setBarberId(data.id));
    });
  }, []);

  /* ── Load counts ── */
  useEffect(() => {
    if (!barberId) return;
    async function loadCounts() {
      const all = await supabase
        .from('appointments').select('status', { count: 'exact', head: false })
        .eq('barber_id', barberId!);
      const map: Record<string, number> = { all: all.count ?? 0 };
      for (const s of ['pending','confirmed','completed','cancelled','no_show'] as Status[]) {
        const r = await supabase
          .from('appointments').select('id', { count: 'exact', head: true })
          .eq('barber_id', barberId!).eq('status', s);
        map[s] = r.count ?? 0;
      }
      setCounts(map);
    }
    loadCounts();
  }, [barberId, appts]);

  /* ── Load appointments ── */
  const loadAppts = useCallback(async (reset = true) => {
    if (!barberId) return;
    if (reset) setLoading(true); else setLoadingMore(true);

    const from = reset ? 0 : page * PAGE_SIZE;
    let q = supabase
      .from('appointments')
      .select('*, services(name, duration_minutes), stylists(name)')
      .eq('barber_id', barberId)
      .order('starts_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (tab !== 'all') q = q.eq('status', tab);
    if (query.trim()) q = q.ilike('customer_name', `%${query.trim()}%`);

    const { data } = await q;
    const rows = data ?? [];

    if (reset) {
      setAppts(rows);
      setPage(1);
    } else {
      setAppts(a => [...a, ...rows]);
      setPage(p => p + 1);
    }
    setHasMore(rows.length === PAGE_SIZE);
    if (reset) setLoading(false); else setLoadingMore(false);
  }, [barberId, tab, query]);

  useEffect(() => { loadAppts(true); }, [barberId, tab, query]);

  /* ── Update status ── */
  async function updateStatus(id: string, status: Status) {
    setUpdating(id);
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAppts(a => a.map(x => x.id === id ? { ...x, status } : x));
    setUpdating(null);
  }

  /* ── Derived ── */
  const pendingRevenue = appts
    .filter(a => a.status === 'confirmed')
    .reduce((s, a) => s + a.price_cents, 0);

  return (
    <>
      <PageHeader
        title="Rendez-vous"
        subtitle="Gère et suis tous tes RDV en temps réel."
      />

      {/* Search + filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); }}
            className="input pl-10"
            placeholder="Rechercher un client…"
          />
        </div>
        {pendingRevenue > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl border border-electric-500/20 bg-electric-500/[0.06] px-3 py-2 text-xs">
            <Euro className="h-3.5 w-3.5 text-electric-300" />
            <span className="text-white/50">À encaisser</span>
            <span className="font-semibold text-electric-300">{formatPrice(pendingRevenue)}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition',
              tab === t.key
                ? 'border-electric-500/40 bg-electric-500/10 text-white'
                : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white',
            )}
          >
            {t.label}
            {counts[t.key] !== undefined && counts[t.key] > 0 && (
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                tab === t.key ? 'bg-electric-500/30' : 'bg-white/10',
              )}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" /> Chargement…
        </div>
      ) : appts.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-white/15" />
          <div className="text-sm font-medium text-white/50">Aucun rendez-vous trouvé</div>
          {query && (
            <button onClick={() => setQuery('')} className="mt-2 text-xs text-electric-300 hover:text-electric-200">
              Effacer la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.06] text-left">
                <tr>
                  {['Client', 'Service', 'Date & heure', 'Prix', 'Statut', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {appts.map((a, i) => {
                    const cfg = STATUS_CFG[a.status];
                    const starts = new Date(a.starts_at);
                    const isPast = starts < new Date();
                    return (
                      <motion.tr
                        key={a.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          'group border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.02]',
                          isPast && a.status !== 'confirmed' && 'opacity-60',
                        )}
                      >
                        {/* Client */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-white/60">
                              {a.customer_name.split(' ').map(w => w[0]).slice(0,2).join('')}
                            </div>
                            <div>
                              <div className="font-medium">{a.customer_name}</div>
                              <div className="text-[11px] text-white/35">{a.customer_email}</div>
                            </div>
                          </div>
                        </td>
                        {/* Service */}
                        <td className="px-5 py-3.5 text-white/60">
                          <div className="flex flex-col gap-1">
                            <span>{a.services?.name ?? '—'}</span>
                            {a.recurring_series_id && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-electric-500/20 bg-electric-500/[0.06] px-2 py-0.5 text-[10px] text-electric-300 w-fit">
                                <RefreshCw className="h-2.5 w-2.5" /> Récurrent
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Date */}
                        <td className="px-5 py-3.5">
                          <div className="text-white/80">
                            {starts.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-[11px] text-white/35">
                            {starts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {' — '}
                            {new Date(a.ends_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        {/* Price */}
                        <td className="px-5 py-3.5 font-semibold tabular-nums">
                          {formatPrice(a.price_cents)}
                          {a.deposit_cents > 0 && (
                            <div className="text-[11px] font-normal text-spark-400">
                              {formatPrice(a.deposit_cents)} encaissé
                            </div>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span className={cn('chip text-[11px]', cfg.chip)}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                            {a.status === 'pending' && (
                              <>
                                <ActionBtn
                                  onClick={() => updateStatus(a.id, 'confirmed')}
                                  loading={updating === a.id}
                                  className="text-electric-300 hover:bg-electric-500/10"
                                  title="Confirmer"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </ActionBtn>
                                <ActionBtn
                                  onClick={() => updateStatus(a.id, 'cancelled')}
                                  loading={updating === a.id}
                                  className="text-red-400 hover:bg-red-500/10"
                                  title="Annuler"
                                >
                                  <XCircle className="h-4 w-4" />
                                </ActionBtn>
                              </>
                            )}
                            {a.status === 'confirmed' && (
                              <>
                                <ActionBtn
                                  onClick={() => updateStatus(a.id, 'completed')}
                                  loading={updating === a.id}
                                  className="text-emerald-300 hover:bg-emerald-500/10"
                                  title="Terminé"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </ActionBtn>
                                <ActionBtn
                                  onClick={() => updateStatus(a.id, 'no_show')}
                                  loading={updating === a.id}
                                  className="text-white/40 hover:bg-white/5"
                                  title="No-show"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </ActionBtn>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-white/[0.05] md:hidden">
            {appts.map(a => {
              const cfg = STATUS_CFG[a.status];
              return (
                <div key={a.id} className="px-4 py-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-white/60">
                        {a.customer_name.split(' ').map(w => w[0]).slice(0,2).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{a.customer_name}</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-white/35">{a.services?.name}</span>
                          {a.recurring_series_id && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-electric-500/20 bg-electric-500/[0.06] px-1.5 py-0.5 text-[9px] text-electric-300">
                              <RefreshCw className="h-2 w-2" /> Récurrent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={cn('chip text-[10px]', cfg.chip)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>{new Date(a.starts_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <span className="font-semibold text-white/70">{formatPrice(a.price_cents)}</span>
                  </div>
                  {a.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => updateStatus(a.id, 'confirmed')}
                        disabled={updating === a.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-electric-500/30 bg-electric-500/10 py-2 text-xs font-medium text-electric-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Confirmer
                      </button>
                      <button
                        onClick={() => updateStatus(a.id, 'cancelled')}
                        disabled={updating === a.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2 text-xs font-medium text-white/40"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Refuser
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="border-t border-white/[0.06] p-4 text-center">
              <button
                onClick={() => loadAppts(false)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              >
                {loadingMore
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</>
                  : <><ChevronDown className="h-4 w-4" /> Charger plus</>}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ActionBtn({
  children, onClick, loading, className, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={title}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-40',
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}
