'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, ChevronRight, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';
import { FeaturedBarbers } from '@/components/customer/FeaturedBarbers';
import { Button } from '@/components/ui/Button';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

export default function HomePage() {
  const [city, setCity] = useState('');

  return (
    <div className="min-h-screen bg-ink-950">
      <Nav />

      <main>
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center px-6 py-28 text-center overflow-hidden">
          {/* Halo violet */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-[#7c3aed]/30 blur-[130px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-[#a78bfa]/20 blur-[80px]"
          />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-electric-500/20 bg-electric-500/10 px-4 py-1.5 text-xs font-semibold text-electric-300">
              <Star className="h-3.5 w-3.5 fill-current" />
              Réservation en 30 secondes · 100% gratuit pour les clients
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="mb-4 max-w-2xl text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl"
          >
            Trouve ton coiffeur.{' '}
            <span className="text-electric-400">Réserve en ligne.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="mb-10 max-w-lg text-base text-white/55 leading-relaxed"
          >
            Les meilleurs coiffeurs près de toi, disponibles en temps réel.
            Réserve sans appel, sans WhatsApp.
          </motion.p>

          {/* Barre de recherche */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24 }}
            className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Ville ou quartier..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    window.location.href = city
                      ? `/barbers?city=${encodeURIComponent(city)}`
                      : '/barbers';
                  }
                }}
                className="input w-full pl-9 pr-4"
              />
            </div>
            <Button
              href={city ? `/barbers?city=${encodeURIComponent(city)}` : '/barbers'}
              size="md"
            >
              <Search className="h-4 w-4" />
              Rechercher
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 text-xs text-white/25"
          >
            Paris · Lyon · Marseille · Bordeaux · Toulouse · Lille
          </motion.p>
        </section>

        {/* ── Barbers en vedette ────────────────────────────── */}
        <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <motion.div
              {...fadeUp}
              className="mb-10 flex items-end justify-between"
            >
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-white/30">
                  À la une
                </p>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  Coiffeurs populaires
                </h2>
              </div>
              <Link
                href="/barbers"
                className="hidden items-center gap-1 text-sm font-medium text-electric-400 transition hover:text-white sm:flex"
              >
                Voir tous <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <FeaturedBarbers />

            <div className="mt-8 text-center sm:hidden">
              <Link href="/barbers" className="text-sm font-medium text-electric-400">
                Voir tous les coiffeurs →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Comment ça marche ─────────────────────────────── */}
        <section
          id="comment-ca-marche"
          className="border-t border-white/[0.06] px-6 py-20"
        >
          <div className="mx-auto max-w-5xl">
            <motion.div {...fadeUp} className="mb-14 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">
                Simple
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Réserve en 3 clics
              </h2>
            </motion.div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  num: '01',
                  title: 'Trouve ton coiffeur',
                  desc: 'Filtre par ville, spécialité ou note. Consulte les galeries et les avis clients.',
                },
                {
                  num: '02',
                  title: 'Choisis ton créneau',
                  desc: 'Disponibilités en temps réel. Sélectionne la date et l\'heure qui te conviennent.',
                },
                {
                  num: '03',
                  title: 'Confirme en 30s',
                  desc: 'Confirmation par email immédiate. Rappel automatique la veille du rendez-vous.',
                },
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="card p-7"
                >
                  <span className="mb-4 block text-3xl font-black text-electric-500/30">
                    {step.num}
                  </span>
                  <h3 className="mb-2 font-bold text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/50">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA barbers ───────────────────────────────────── */}
        <section className="border-t border-white/[0.06] px-6 py-16">
          <motion.div
            {...fadeUp}
            className="mx-auto max-w-xl rounded-2xl border border-electric-500/15 bg-electric-500/[0.06] p-10 text-center"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-electric-400">
              Tu es coiffeur ?
            </p>
            <h2 className="mb-3 text-2xl font-extrabold text-white sm:text-3xl">
              Remplis ton agenda automatiquement
            </h2>
            <p className="mb-7 text-sm leading-relaxed text-white/50">
              Rejoins BookedUp et dis adieu aux no-shows. Réservations en ligne,
              acomptes Stripe, rappels auto — tout en un.
            </p>
            <Button href="/register?role=barber" size="lg">
              Créer mon espace coiffeur <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
