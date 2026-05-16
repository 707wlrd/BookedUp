'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, BadgeCheck, ArrowRight, Navigation2, Loader2 } from 'lucide-react';
import { MOCK_BARBERS } from '@/lib/mock-data';
import { formatPrice } from '@/lib/utils';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getDistance, formatDistance } from '@/lib/geo';

export function FeaturedBarbers() {
  const geo = useGeolocation();

  const barbers = useMemo(() => {
    return MOCK_BARBERS.map((b) => ({
      ...b,
      dist:
        geo.status === 'granted' && geo.lat !== null && geo.lng !== null
          ? getDistance(geo.lat, geo.lng, b.latitude ?? 0, b.longitude ?? 0)
          : null,
    })).sort((a, b) => {
      if (a.dist !== null && b.dist !== null) return a.dist - b.dist;
      return 0;
    });
  }, [geo.status, geo.lat, geo.lng]);

  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="label">
              {geo.status === 'granted' ? 'Près de toi' : 'Featured'}
            </p>
            <h2 className="mt-2 text-display-md">
              {geo.status === 'granted' ? 'Les barbers à côté.' : 'Les barbers en vue.'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Geo prompt — subtle */}
            <AnimatePresence>
              {geo.status === 'idle' && (
                <motion.button
                  key="geo-prompt"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  onClick={geo.request}
                  className="hidden items-center gap-1.5 rounded-full border border-electric-500/25 bg-electric-500/[0.08] px-3 py-1.5 text-xs font-medium text-electric-300 transition hover:bg-electric-500/15 sm:inline-flex"
                >
                  <Navigation2 className="h-3 w-3" />
                  Près de moi
                </motion.button>
              )}
              {geo.status === 'requesting' && (
                <motion.span
                  key="geo-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hidden items-center gap-1.5 text-xs text-white/40 sm:inline-flex"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Localisation…
                </motion.span>
              )}
              {geo.status === 'granted' && (
                <motion.span
                  key="geo-ok"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1.5 text-xs font-medium text-emerald-400 sm:inline-flex"
                >
                  <Navigation2 className="h-3 w-3" />
                  Position activée
                </motion.span>
              )}
            </AnimatePresence>

            <Link
              href="/barbers"
              className="arrow-slide hidden text-sm text-electric-300 transition hover:text-electric-200 sm:inline-flex sm:items-center sm:gap-1.5"
            >
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((b, i) => {
            const minPrice = Math.min(...b.services.map((s) => s.price_cents));
            return (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
                }}
              >
                <Link
                  href={`/barbers/${b.slug}`}
                  className="card card-glow card-hover group block overflow-hidden"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${b.cover_image_url})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/20 to-transparent" />

                    {/* Verified badge */}
                    {b.subscription_tier !== 'free' && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-electric-500/40 bg-electric-500/15 px-2 py-0.5 text-[10px] font-semibold text-electric-100 backdrop-blur-md">
                        <BadgeCheck className="h-3 w-3" /> Vérifié
                      </span>
                    )}

                    {/* Distance badge */}
                    <AnimatePresence>
                      {b.dist !== null && (
                        <motion.span
                          key="dist"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md"
                        >
                          <Navigation2 className="h-3 w-3 text-electric-300" />
                          {formatDistance(b.dist)}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-lg font-bold leading-tight">{b.shop_name}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-white/70">
                          <MapPin className="h-3 w-3" /> {b.city}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-ink-900/80 px-2 py-1 text-xs backdrop-blur-md">
                        <Star className="h-3 w-3 fill-spark-400 text-spark-400" />
                        <span className="font-semibold">{b.rating_average}</span>
                        <span className="text-white/40">({b.rating_count})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="text-xs text-white/50">
                      À partir de{' '}
                      <span className="text-base font-semibold text-white">{formatPrice(minPrice)}</span>
                    </div>
                    <span className="arrow-slide inline-flex items-center gap-1 text-xs font-medium text-electric-300 opacity-70 group-hover:opacity-100">
                      Réserver <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile "Voir tout" */}
        <div className="mt-6 text-center sm:hidden">
          <Link href="/barbers" className="btn-ghost text-sm">
            Voir tous les barbers <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
