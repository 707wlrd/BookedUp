'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Clock, User, Euro,
  CheckCircle2, XCircle, AlertCircle, X, Loader2, CalendarDays, Lock,
} from 'lucide-react';
import { PageHeader } from '@/components/studio/StatCard';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';

/* ── Constants ─────────────────────────────────────────── */
const DAY_START  = 8;   // 08:00
const DAY_END    = 20;  // 20:00
const HOUR_H     = 72;  // px per hour
const TOTAL_H    = (DAY_END - DAY_START) * HOUR_H;
const HOURS      = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
const DAYS_FR    = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/* ── Types ──────────────────────────────────────────────── */
type Status = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

type BlockDraft = { dayIdx: number; date: Date; startMin: number } | null;

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
  services?: { name: string; duration_minutes: number } | null;
}

/* ── Status config ──────────────────────────────────────── */
const STATUS: Record<Status, { label: string; block: string; dot: string; icon: React.ReactNode }> = {
  confirmed: {
    label: 'Confirmé',
    block: 'border-electric-500/50 bg-electric-500/15 text-electric-100',
    dot: 'bg-electric-400',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-electric-400" />,
  },
  pending: {
    label: 'En attente',
    block: 'border-spark-500/50 bg-spark-500/15 text-spark-100',
    dot: 'bg-spark-400',
    icon: <AlertCircle className="h-3.5 w-3.5 text-spark-400" />,
  },
  completed: {
    label: 'Terminé',
    block: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
    dot: 'bg-emerald-400',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  },
  cancelled: {
    label: 'Annulé',
    block: 'border-white/10 bg-white/[0.03] text-white/40 line-through',
    dot: 'bg-white/25',
    icon: <XCircle className="h-3.5 w-3.5 text-white/30" />,
  },
  no_show: {
    label: 'No-show',
    block: 'border-red-500/40 bg-red-500/10 text-red-300',
    dot: 'bg-red-400',
    icon: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  },
};

/* ── Helpers ────────────────────────────────────────────── */
function getMondayOf(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function toMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}
function topPx(date: Date) {
  const mins = toMinutes(date) - DAY_START * 60;
  return Math.max(0, (mins / 60) * HOUR_H);
}
function heightPx(start: Date, end: Date) {
  const mins = (end.getTime() - start.getTime()) / 60_000;
  return Math.max(20, (mins / 60) * HOUR_H);
}

/* ══════════════════════════════════════════════════════════ */
export default function CalendarPage() {
  const supabase = createClient();

  const [barberId, setBarberId]     = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [appts, setAppts]           = useState<Appt[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Appt | null>(null);
  const [nowY, setNowY]             = useState<number | null>(null);
  const [updating, setUpdating]     = useState(false);
  const [blockDraft, setBlockDraft] = useState<BlockDraft>(null);
  const [blockLabel, setBlockLabel] = useState('');
  const [blockDur, setBlockDur]     = useState(60);
  const [blockSaving, setBlockSaving] = useState(false);
  const gridRef                     = useRef<HTMLDivElement>(null);

  /* Monday of displayed week */
  const monday = useMemo(() => {
    const d = getMondayOf(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const sunday = useMemo(() => addDays(monday, 6), [monday]);
  const isCurrentWeek = weekOffset === 0;

  const rangeLabel = useMemo(() => {
    const s = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const e = sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  }, [monday, sunday]);

  /* Load barber */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('barbers').select('id').eq('owner_id', user.id).single()
        .then(({ data }) => data && setBarberId(data.id));
    });
  }, []);

  /* Load appointments for the week */
  const loadAppts = useCallback(async () => {
    if (!barberId) return;
    setLoading(true);
    const from = monday.toISOString();
    const to   = addDays(sunday, 1).toISOString();
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name, duration_minutes), stylists(name)')
      .eq('barber_id', barberId)
      .gte('starts_at', from)
      .lt('starts_at', to)
      .order('starts_at');
    setAppts(data ?? []);
    setLoading(false);
  }, [barberId, monday]);

  useEffect(() => { loadAppts(); }, [loadAppts]);

  /* Current time indicator */
  useEffect(() => {
    function update() {
      const now = new Date();
      const mins = toMinutes(now) - DAY_START * 60;
      if (mins >= 0 && mins <= (DAY_END - DAY_START) * 60) {
        setNowY((mins / 60) * HOUR_H);
      } else {
        setNowY(null);
      }
    }
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  /* Scroll to current time on load */
  useEffect(() => {
    if (nowY !== null && gridRef.current && isCurrentWeek) {
      gridRef.current.scrollTop = Math.max(0, nowY - 120);
    }
  }, [nowY, isCurrentWeek]);

  /* Group by day index (0=Mon … 6=Sun) */
  const byDay = useMemo(() => {
    const map: Record<number, Appt[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    for (const a of appts) {
      const d   = new Date(a.starts_at);
      const idx = (d.getDay() + 6) % 7;
      map[idx]?.push(a);
    }
    return map;
  }, [appts]);

  /* Click on empty column slot → compute time from y offset */
  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dayIdx: number) {
    if ((e.target as HTMLElement).closest('button')) return; // clicked an appt block
    const rect    = e.currentTarget.getBoundingClientRect();
    const rawMins = ((e.clientY - rect.top) / HOUR_H) * 60 + DAY_START * 60;
    const snapped = Math.round(rawMins / 30) * 30; // snap to 30 min
    const date    = addDays(monday, dayIdx);
    setBlockDraft({ dayIdx, date, startMin: snapped });
    setBlockLabel('');
    setBlockDur(60);
  }

  /* Save a "blocked" slot (status = 'blocked', stored as appointment) */
  async function saveBlock() {
    if (!blockDraft || !barberId) return;
    setBlockSaving(true);
    const start = new Date(blockDraft.date);
    start.setHours(Math.floor(blockDraft.startMin / 60), blockDraft.startMin % 60, 0, 0);
    const end = new Date(start.getTime() + blockDur * 60_000);

    const { data: newAppt } = await supabase.from('appointments').insert({
      barber_id:      barberId,
      customer_name:  blockLabel || 'Blocage',
      customer_email: 'blocked@bookedup.fr',
      starts_at:      start.toISOString(),
      ends_at:        end.toISOString(),
      status:         'cancelled',  // hidden from clients, shown greyed in calendar
      price_cents:    0,
      deposit_cents:  0,
      payment_status: 'pending',
      notes:          blockLabel || 'Créneau bloqué',
    }).select('*, services(name, duration_minutes)').single();

    if (newAppt) setAppts(prev => [...prev, newAppt as Appt]);
    setBlockDraft(null);
    setBlockSaving(false);
  }

  /* Update status */
  async function updateStatus(id: string, status: Status) {
    setUpdating(true);
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAppts(a => a.map(x => x.id === id ? { ...x, status } : x));
    setSelected(s => s?.id === id ? { ...s, status } : s);
    setUpdating(false);
  }

  const todayIdx = isCurrentWeek ? (new Date().getDay() + 6) % 7 : -1;
  const totalAppts = appts.length;
  const confirmedAppts = appts.filter(a => a.status === 'confirmed').length;
  const revenue = appts
    .filter(a => a.status === 'confirmed' || a.status === 'completed')
    .reduce((s, a) => s + a.price_cents, 0);

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle={rangeLabel}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="glass flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-white/[0.08]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-medium transition',
                isCurrentWeek
                  ? 'bg-electric-500/20 text-electric-300'
                  : 'glass hover:bg-white/[0.08]',
              )}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="glass flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-white/[0.08]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Week summary */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="chip">
          <CalendarDays className="h-3 w-3 text-white/30" />
          <span className="text-white/40">{totalAppts} RDV</span>
          {confirmedAppts > 0 && (
            <span className="ml-1 font-semibold text-electric-300">{confirmedAppts} confirmés</span>
          )}
        </div>
        {revenue > 0 && (
          <div className="chip">
            <Euro className="h-3 w-3 text-white/30" />
            <span className="text-white/40">Revenus</span>
            <span className="font-semibold text-white/70">{formatPrice(revenue)}</span>
          </div>
        )}
        {loading && (
          <div className="chip">
            <Loader2 className="h-3 w-3 animate-spin text-white/30" />
            <span className="text-white/30">Chargement…</span>
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid border-b border-white/[0.06]" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
          <div className="border-r border-white/[0.06]" />
          {DAYS_FR.map((label, i) => {
            const date    = addDays(monday, i);
            const isToday = i === todayIdx;
            return (
              <div
                key={i}
                className={cn(
                  'border-r border-white/[0.06] p-2.5 text-center last:border-r-0',
                  isToday && 'bg-electric-500/[0.06]',
                )}
              >
                <div className={cn('text-[11px] font-medium uppercase tracking-wide', isToday ? 'text-electric-300' : 'text-white/35')}>
                  {label}
                </div>
                <div className={cn(
                  'mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
                  isToday ? 'bg-electric-500 text-white shadow-glow' : 'text-white/80',
                )}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable grid */}
        <div ref={gridRef} className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
          <div className="relative grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)', height: TOTAL_H }}>

            {/* Hour labels */}
            <div className="relative border-r border-white/[0.06]">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 text-[10px] text-white/25 -translate-y-2"
                  style={{ top: (h - DAY_START) * HOUR_H }}
                >
                  {h < 10 ? `0${h}` : h}h
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DAYS_FR.map((_, dayIdx) => {
              const isToday = dayIdx === todayIdx;
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'relative border-r border-white/[0.06] last:border-r-0 cursor-cell',
                    isToday && 'bg-electric-500/[0.025]',
                  )}
                  onClick={e => handleColumnClick(e, dayIdx)}
                >
                  {/* Hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-white/[0.04]"
                      style={{ top: (h - DAY_START) * HOUR_H }}
                    />
                  ))}
                  {/* Half-hour lines */}
                  {HOURS.slice(0, -1).map((h) => (
                    <div
                      key={`${h}h`}
                      className="absolute left-0 right-0 border-t border-white/[0.02]"
                      style={{ top: (h - DAY_START) * HOUR_H + HOUR_H / 2 }}
                    />
                  ))}

                  {/* Appointments */}
                  {(byDay[dayIdx] ?? []).map((a) => {
                    const start  = new Date(a.starts_at);
                    const end    = new Date(a.ends_at);
                    const top    = topPx(start);
                    const height = heightPx(start, end);
                    const cfg    = STATUS[a.status] ?? STATUS.pending;
                    const short  = height < 48;

                    return (
                      <button
                        key={a.id}
                        onClick={() => setSelected(a)}
                        className={cn(
                          'absolute left-1 right-1 overflow-hidden rounded-lg border px-2 py-1 text-left transition-all hover:z-10 hover:brightness-110 hover:shadow-lg',
                          cfg.block,
                        )}
                        style={{ top, height }}
                      >
                        <div className={cn('font-semibold leading-tight truncate', short ? 'text-[10px]' : 'text-[11px]')}>
                          {a.customer_name}
                        </div>
                        {!short && (
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] opacity-70">
                            <Clock className="h-2.5 w-2.5" />
                            {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {a.services && ` · ${a.services.name}`}
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Current time indicator */}
                  {isToday && nowY !== null && (
                    <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: nowY }}>
                      <div className="h-2 w-2 rounded-full bg-red-400 ring-2 ring-red-400/30" />
                      <div className="flex-1 border-t border-red-400/60" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!loading && totalAppts === 0 && (
        <div className="mt-8 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-white/15" />
          <p className="mt-3 text-sm text-white/35">Aucun RDV cette semaine.</p>
        </div>
      )}

      {/* ── Block slot modal ── */}
      <AnimatePresence>
        {blockDraft && (
          <>
            <motion.div key="block-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setBlockDraft(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
            <motion.div key="block-modal"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/[0.1] bg-[rgb(10,11,14)] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06]">
                  <Lock className="h-4 w-4 text-white/60" />
                </div>
                <div>
                  <div className="font-semibold">Bloquer un créneau</div>
                  <div className="text-xs text-white/40">
                    {blockDraft.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                    {' · '}
                    {`${String(Math.floor(blockDraft.startMin / 60)).padStart(2, '0')}:${String(blockDraft.startMin % 60).padStart(2, '0')}`}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label text-xs">Raison (optionnel)</label>
                  <input className="input mt-1 w-full text-sm"
                    placeholder="Ex : Pause déjeuner, Formation…"
                    value={blockLabel}
                    onChange={e => setBlockLabel(e.target.value)}
                    autoFocus />
                </div>
                <div>
                  <label className="label text-xs">Durée</label>
                  <select className="input mt-1 w-full text-sm cursor-pointer"
                    value={blockDur}
                    onChange={e => setBlockDur(Number(e.target.value))}>
                    {[30, 60, 90, 120, 180, 240].map(d => (
                      <option key={d} value={d}>
                        {d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? d % 60 : ''}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button onClick={() => setBlockDraft(null)}
                  className="flex-1 rounded-xl border border-white/[0.1] py-2.5 text-sm text-white/50 transition hover:text-white">
                  Annuler
                </button>
                <button onClick={saveBlock} disabled={blockSaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.08] py-2.5 text-sm font-medium transition hover:bg-white/[0.12] disabled:opacity-40">
                  {blockSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Bloquer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Appointment detail panel ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.aside
              key="panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm overflow-y-auto border-l border-white/[0.08] bg-[rgb(5,6,8)] shadow-[−8px_0_40px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <div className="text-sm font-semibold">Détail du RDV</div>
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] transition hover:bg-white/[0.10]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-6 p-6">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  {STATUS[selected.status].icon}
                  <span className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    selected.status === 'confirmed' && 'bg-electric-500/15 text-electric-300',
                    selected.status === 'pending'   && 'bg-spark-500/15 text-spark-300',
                    selected.status === 'completed' && 'bg-emerald-500/15 text-emerald-300',
                    selected.status === 'cancelled' && 'bg-white/5 text-white/40',
                    selected.status === 'no_show'   && 'bg-red-500/15 text-red-300',
                  )}>
                    {STATUS[selected.status].label}
                  </span>
                </div>

                {/* Client */}
                <div className="card p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-white/30" />
                    {selected.customer_name}
                  </div>
                  <div className="text-xs text-white/40">{selected.customer_email}</div>
                  {selected.customer_phone && (
                    <div className="text-xs text-white/40">{selected.customer_phone}</div>
                  )}
                </div>

                {/* Time + Service */}
                <div className="space-y-2">
                  <div className="flex items-start gap-3 text-sm">
                    <Clock className="mt-0.5 h-4 w-4 flex-none text-electric-300" />
                    <div>
                      <div className="font-medium">
                        {new Date(selected.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </div>
                      <div className="text-white/50">
                        {new Date(selected.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' → '}
                        {new Date(selected.ends_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {selected.services && (
                    <div className="flex items-center gap-3 text-sm">
                      <Euro className="h-4 w-4 flex-none text-spark-400" />
                      <div>
                        <div className="font-medium">{selected.services.name}</div>
                        <div className="text-white/50">{formatPrice(selected.price_cents)}</div>
                      </div>
                    </div>
                  )}
                  {selected.deposit_cents > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-spark-500/20 bg-spark-500/[0.06] px-3 py-2 text-xs text-spark-300">
                      Acompte de {formatPrice(selected.deposit_cents)} encaissé
                    </div>
                  )}
                </div>

                {/* Actions */}
                {(selected.status === 'pending' || selected.status === 'confirmed') && (
                  <div className="space-y-2 border-t border-white/[0.06] pt-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-white/35">Actions</div>
                    {selected.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(selected.id, 'confirmed')}
                        disabled={updating}
                        className="flex w-full items-center gap-2 rounded-xl border border-electric-500/30 bg-electric-500/10 px-4 py-3 text-sm font-medium text-electric-300 transition hover:bg-electric-500/15 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmer le RDV
                      </button>
                    )}
                    {selected.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(selected.id, 'completed')}
                        disabled={updating}
                        className="flex w-full items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Marquer comme terminé
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(selected.id, 'no_show')}
                      disabled={updating}
                      className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/50 transition hover:bg-white/[0.06] disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      No-show
                    </button>
                    <button
                      onClick={() => updateStatus(selected.id, 'cancelled')}
                      disabled={updating}
                      className="flex w-full items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Annuler le RDV
                    </button>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
