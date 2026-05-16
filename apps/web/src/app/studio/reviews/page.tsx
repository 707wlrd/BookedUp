'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, TrendingUp, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string;
  serviceName: string | null;
  createdAt: string;
};

type Data = {
  ratingAverage: number;
  ratingCount: number;
  reviews: Review[];
};

const LABELS = ['', 'Mauvais', 'Bof', 'Bien', 'Très bien', 'Excellent'];
const LABEL_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-emerald-400'];

export default function ReviewsPage() {
  const [data, setData]       = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<0 | 1 | 2 | 3 | 4 | 5>(0); // 0 = all

  useEffect(() => {
    fetch('/api/studio/reviews')
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Distribution per star (5 → 1)
  const dist = useMemo(() => {
    if (!data?.reviews) return [0, 0, 0, 0, 0];
    return [5, 4, 3, 2, 1].map(n =>
      data.reviews.filter(r => r.rating === n).length
    );
  }, [data]);

  const filtered = useMemo(() => {
    if (!data?.reviews) return [];
    if (filter === 0) return data.reviews;
    return data.reviews.filter(r => r.rating === filter);
  }, [data, filter]);

  // "New" = created in the last 7 days
  function isNew(iso: string) {
    return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function relativeDate(iso: string) {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    if (diff < 30)  return `Il y a ${diff} jours`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-electric-400" />
      </div>
    );
  }

  const avg   = data?.ratingAverage ?? 0;
  const total = data?.ratingCount   ?? 0;

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Avis clients</h1>
        <p className="mt-1 text-sm text-white/45">
          {total === 0 ? 'Aucun avis pour l\'instant.' : `${total} avis · Note moyenne ${avg.toFixed(1)}/5`}
        </p>
      </div>

      {total === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-20 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-white/[0.04]">
            <Star className="h-7 w-7 text-white/20" />
          </div>
          <div>
            <p className="font-semibold text-white/60">Aucun avis encore</p>
            <p className="mt-1 text-sm text-white/30">
              Les demandes d'avis sont envoyées automatiquement le lendemain d'un RDV complété.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Overview ── */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Big rating */}
            <div className="card flex items-center gap-6 p-6">
              <div className="text-center">
                <div className="text-6xl font-black tracking-tight text-white">
                  {avg.toFixed(1)}
                </div>
                <div className="mt-2 flex justify-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-4 w-4',
                        i < Math.round(avg) ? 'fill-yellow-400 text-yellow-400' : 'text-white/15',
                      )}
                    />
                  ))}
                </div>
                <div className="mt-1.5 text-xs text-white/35">{total} avis</div>
              </div>

              {/* Distribution bars */}
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((n, idx) => {
                  const count = dist[idx];
                  const pct   = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <button
                      key={n}
                      onClick={() => setFilter(filter === n ? 0 : n as any)}
                      className={cn(
                        'group flex w-full items-center gap-2 rounded-lg px-2 py-1 transition-all hover:bg-white/[0.04]',
                        filter === n && 'bg-white/[0.06]',
                      )}
                    >
                      <span className="w-4 text-right text-xs text-white/40">{n}</span>
                      <Star className="h-3 w-3 shrink-0 fill-yellow-400/60 text-yellow-400/60" />
                      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full bg-yellow-400/70"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="w-7 text-right text-xs text-white/35">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-5">
                <div className="text-xs uppercase tracking-wider text-white/35">Note / 5</div>
                <div className="mt-2 text-3xl font-black">{avg.toFixed(1)}</div>
                <div className="mt-1 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('h-3 w-3', i < Math.round(avg) ? 'fill-yellow-400 text-yellow-400' : 'text-white/15')} />
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs uppercase tracking-wider text-white/35">Total avis</div>
                <div className="mt-2 text-3xl font-black">{total}</div>
                <div className="mt-1 text-xs text-white/35">
                  {data!.reviews.filter(r => isNew(r.createdAt)).length} cette semaine
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs uppercase tracking-wider text-white/35">Satisfaction</div>
                <div className="mt-2 text-3xl font-black">
                  {total > 0
                    ? Math.round((data!.reviews.filter(r => r.rating >= 4).length / total) * 100)
                    : 0}%
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>notes ≥ 4★</span>
                </div>
              </div>

              <div className="card p-5">
                <div className="text-xs uppercase tracking-wider text-white/35">Avec commentaire</div>
                <div className="mt-2 text-3xl font-black">
                  {total > 0
                    ? Math.round((data!.reviews.filter(r => r.comment).length / total) * 100)
                    : 0}%
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-white/35">
                  <MessageSquare className="h-3 w-3" />
                  <span>ont écrit</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/30" />
            <div className="flex gap-2 flex-wrap">
              {([0, 5, 4, 3, 2, 1] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setFilter(n)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                    filter === n
                      ? 'bg-electric-500 text-white'
                      : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.09] hover:text-white',
                  )}
                >
                  {n === 0 ? 'Tous' : (
                    <>
                      {n}
                      <Star className="h-3 w-3 fill-current" />
                    </>
                  )}
                </button>
              ))}
            </div>
            {filter !== 0 && (
              <span className="text-xs text-white/30">
                {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* ── Review list ── */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card py-12 text-center text-sm text-white/30"
                >
                  Aucun avis {filter > 0 ? `à ${filter} étoile${filter > 1 ? 's' : ''}` : ''}.
                </motion.div>
              ) : (
                filtered.map(r => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    className="card p-5"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-electric-500/15 text-xs font-bold text-electric-300">
                        {initials(r.customerName)}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Top row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{r.customerName}</span>
                          {isNew(r.createdAt) && (
                            <span className="rounded-full bg-electric-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-electric-400">
                              Nouveau
                            </span>
                          )}
                          <span className="ml-auto text-xs text-white/30 shrink-0">
                            {relativeDate(r.createdAt)}
                          </span>
                        </div>

                        {/* Stars + label */}
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  'h-3.5 w-3.5',
                                  i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/15',
                                )}
                              />
                            ))}
                          </div>
                          <span className={cn('text-xs font-medium', LABEL_COLORS[r.rating])}>
                            {LABELS[r.rating]}
                          </span>
                          {r.serviceName && (
                            <>
                              <span className="text-white/15">·</span>
                              <span className="text-xs text-white/35">{r.serviceName}</span>
                            </>
                          )}
                        </div>

                        {/* Comment */}
                        {r.comment && (
                          <p className="mt-2.5 text-sm leading-relaxed text-white/65">
                            "{r.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
