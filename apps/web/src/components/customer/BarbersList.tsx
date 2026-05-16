'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, MapPin, BadgeCheck, Navigation2, NavigationOff,
  Loader2, AlertTriangle, SlidersHorizontal, Search,
} from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getDistance, formatDistance } from '@/lib/geo';
import { formatPrice, cn } from '@/lib/utils';
import type { Barber, Service } from '@bookedup/shared';

type BarberWithServices = Barber & { services: Service[]; portfolio?: string[] };

interface Props {
  barbers: BarberWithServices[];
}

type SortMode = 'distance' | 'rating' | 'price';

export function BarbersList({ barbers }: Props) {
  const geo = useGeolocation();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('rating');

  /* Switch to distance sort automatically once granted */
  useMemo(() => {
    if (geo.status === 'granted') setSort('distance');
  }, [geo.status]);

  /* Filter + sort */
  const list = useMemo(() => {
    const q = query.toLowerCase().trim();

    return barbers
      .filter((b) => {
        if (!q) return true;
        return (
          b.shop_name.toLowerCase().includes(q) ||
          (b.city ?? '').toLowerCase().includes(q) ||
          b.services.some((s) => s.name.toLowerCase().includes(q))
        );
      })
      .map((b) => {
        const dist =
          geo.status === 'granted' && geo.lat !== null && geo.lng !== null
            ? getDistance(geo.lat, geo.lng, b.latitude ?? 0, b.longitude ?? 0)
            : null;
        return { ...b, dist };
      })
      .sort((a, b) => {
        if (sort === 'distance') {
          if (a.dist === null && b.dist === null) return 0;
          if (a.dist === null) return 1;
          if (b.dist === null) return -1;
          return a.dist - b.dist;
        }
        if (sort === 'rating') return b.rating_average - a.rating_average;
        if (sort === 'price') {
          const aMin = Math.min(...a.services.map((s) => s.price_cents));
          const bMin = Math.min(...b.services.map((s) => s.price_cents));
          return aMin - bMin;
        }
        return 0;
      });
  }, [barbers, query, sort, geo.status, geo.lat, geo.lng]);

  return (
    <div className="space-y-6">
      {/* ── Search + sort bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-10"
            placeholder="Ville, coiffeur, service…"
          />
        </div>

        {/* Sort pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
          <SlidersHorizontal className="ml-1 h-3.5 w-3.5 flex-none text-white/30" />
          {(
            [
              { key: 'distance', label: 'Distance' },
              { key: 'rating',   label: 'Note' },
              { key: 'price',    label: 'Prix' },
            ] as { key: SortMode; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'distance' && geo.status === 'idle') {
                  geo.request();
                }
                setSort(key);
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150',
                sort === key
                  ? 'bg-electric-500 text-white shadow-glow'
                  : 'text-white/50 hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Geo permission banner ── */}
      <AnimatePresence>
        {geo.status === 'idle' && (
          <motion.div
            key="geo-idle"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between gap-4 rounded-2xl border border-electric-500/20 bg-electric-500/[0.06] px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-electric-500/15">
                <Navigation2 className="h-4 w-4 text-electric-300" />
              </div>
              <div>
                <div className="text-sm font-semibold">Trouve les coiffeurs près de toi</div>
                <div className="text-xs text-white/50">Active ta position pour trier par distance.</div>
              </div>
            </div>
            <button
              onClick={geo.request}
              className="flex-none rounded-full bg-electric-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-electric-400 hover:shadow-[0_4px_16px_-4px_rgba(59,130,255,0.5)]"
            >
              Autoriser
            </button>
          </motion.div>
        )}

        {geo.status === 'requesting' && (
          <motion.div
            key="geo-requesting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 text-sm text-white/60"
          >
            <Loader2 className="h-4 w-4 animate-spin text-electric-300" />
            Récupération de ta position…
          </motion.div>
        )}

        {geo.status === 'granted' && geo.lat !== null && (
          <motion.div
            key="geo-granted"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-3 text-sm"
          >
            <Navigation2 className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-300 font-medium">Position détectée</span>
            <span className="text-white/40">— coiffeurs triés par distance</span>
          </motion.div>
        )}

        {(geo.status === 'denied' || geo.status === 'unavailable') && (
          <motion.div
            key="geo-denied"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-3 text-sm text-white/50"
          >
            <NavigationOff className="h-4 w-4 text-white/30" />
            {geo.error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results count ── */}
      <div className="text-sm text-white/40">
        {list.length} coiffeur{list.length > 1 ? 's' : ''}
        {query && <span> pour « <span className="text-white/70">{query}</span> »</span>}
        {geo.status === 'granted' && <span> · triés par distance</span>}
      </div>

      {/* ── Cards grid ── */}
      <AnimatePresence mode="popLayout">
        {list.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center text-white/40"
          >
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">Aucun coiffeur trouvé pour « {query} ».</p>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((b, i) => {
              const minPrice = Math.min(...b.services.map((s) => s.price_cents));
              return (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={`/barbers/${b.slug}`}
                    className="card card-hover group block overflow-hidden"
                  >
                    {/* Cover image */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${b.cover_image_url})` }}
                      />
                      {/* Distance badge */}
                      {b.dist !== null && (
                        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                          <Navigation2 className="h-3 w-3 text-electric-300" />
                          {formatDistance(b.dist)}
                        </div>
                      )}
                      {/* Verified overlay */}
                      {b.subscription_tier !== 'free' && (
                        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-electric-500/30 bg-electric-500/20 px-2 py-1 text-[10px] font-semibold text-electric-200 backdrop-blur-md">
                          <BadgeCheck className="h-3 w-3" /> Vérifié
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate text-base font-semibold">
                            {b.shop_name}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-white/40">
                            <MapPin className="h-3 w-3 flex-none" />
                            {b.city}
                          </div>
                        </div>
                        <div className="flex flex-none items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-spark-400 text-spark-400" />
                          <span className="font-semibold">{b.rating_average}</span>
                          <span className="text-white/30">({b.rating_count})</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-white/50">
                          À partir de{' '}
                          <span className="font-semibold text-white">{formatPrice(minPrice)}</span>
                        </div>
                        <span className="arrow-slide text-xs text-electric-300 group-hover:text-electric-200">
                          Réserver →
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
