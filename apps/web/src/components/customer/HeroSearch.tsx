'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, MapPin, Star, Calendar, BadgeCheck } from 'lucide-react';

const TAGS = ['Paris', 'Lyon', 'Marseille', 'Fade', 'Barbe'];

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    router.push(`/barbers${params.size ? `?${params.toString()}` : ''}`);
  }

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-spotlight" />

      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-electric-500/30 bg-electric-500/10 px-3 py-1 text-xs font-semibold text-electric-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-glow rounded-full bg-electric-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-electric-300" />
            </span>
            Stay Booked.
          </div>

          <h1 className="text-display-xl text-balance">
            <span className="gradient-text">Trouve ton coiffeur.</span>
            <br />
            <span className="text-white">Réserve en <span className="gradient-spark">30 secondes.</span></span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-white/55 sm:text-lg">
            Les meilleurs coiffeurs près de chez toi. Réservation en ligne, paiement sécurisé, confirmation instantanée.
          </p>

          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="mx-auto mt-10 flex max-w-xl items-center gap-1.5 rounded-full border border-white/[0.08] bg-ink-800/80 p-1.5 shadow-2xl backdrop-blur-xl transition focus-within:border-electric-500/40 focus-within:shadow-glow"
          >
            <div className="flex flex-1 items-center gap-2 px-4">
              <MapPin className="h-4 w-4 flex-none text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ville, nom du salon, style…"
                className="w-full bg-transparent py-3 text-sm placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-primary arrow-slide h-10 px-5">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Rechercher</span>
            </button>
          </motion.form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/40">
            Populaires :
            {TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => router.push(`/barbers?q=${tag}`)}
                className="chip hover:border-electric-500/40 hover:text-white"
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Marketplace preview — bento ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <div className="card overflow-hidden p-2">
            <div className="rounded-[20px] bg-gradient-to-br from-ink-800 to-ink-900 p-6 sm:p-8">
              <div className="grid grid-cols-12 gap-3">
                {/* Featured barber card */}
                <PreviewBarber />
                {/* Quick stats */}
                <div className="col-span-12 grid grid-cols-2 gap-3 md:col-span-5">
                  <PreviewStat Icon={Calendar} label="Réservations" value="12k+" hint="ce mois" />
                  <PreviewStat Icon={Star} label="Note moyenne" value="4.9" hint="sur 5" highlight />
                  <PreviewStat Icon={MapPin} label="Villes" value="50+" hint="en France" />
                  <PreviewStat Icon={BadgeCheck} label="Coiffeurs" value="200+" hint="vérifiés" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PreviewBarber() {
  return (
    <div className="col-span-12 md:col-span-7">
      <div className="relative h-full overflow-hidden rounded-2xl border border-white/10">
        <div
          className="aspect-[16/10] w-full bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-semibold">Malik Cuts</h3>
                <BadgeCheck className="h-4 w-4 text-electric-400" />
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-white/65">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-electric-400 text-electric-400" />
                  4.9 · 312 avis
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Paris
                </span>
              </div>
            </div>
            <div className="chip-electric">Disponible aujourd'hui</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({
  Icon, label, value, hint, highlight,
}: { Icon: any; label: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <div
      className={
        'rounded-2xl border p-4 transition ' +
        (highlight
          ? 'border-electric-500/30 bg-electric-500/[0.05]'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20')
      }
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${highlight ? 'text-electric-300' : 'text-white/40'}`} />
        <span className="label !text-[10px]">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-[11px] text-white/35">{hint}</div>
    </div>
  );
}
