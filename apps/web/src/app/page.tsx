'use client';

import { motion } from 'framer-motion';
import {
  Calendar,
  CreditCard,
  Bell,
  Star,
  Users,
  RefreshCw,
  Check,
  Scissors,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

/* ─────────────────────────────────────────────
   Animation variant partagé
───────────────────────────────────────────── */
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

const fadeUpDelay = (delay: number) => ({
  ...fadeUp,
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
});

/* ─────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────── */
function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[rgb(5,6,8)]/80 border-b border-white/[0.06]">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight text-white"
        >
          <Scissors className="w-5 h-5 text-[#7C3AED]" strokeWidth={2.2} />
          <span>BookedUp</span>
        </Link>

        {/* Liens centre */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Fonctionnalités', href: '#features' },
            { label: 'Tarifs', href: '#pricing' },
            { label: 'Barbers', href: '/barbers' },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-white/60 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="hidden sm:block text-sm text-white/60 hover:text-white transition-colors duration-200 cursor-pointer px-3 py-1.5"
          >
            Se connecter
          </Link>
          <Link
            href="/auth"
            className="btn-electric text-sm px-4 py-2 rounded-xl font-medium cursor-pointer transition-opacity duration-200 hover:opacity-90"
          >
            Commencer gratuitement
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden"
    >
      {/* Glow violet */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#7C3AED]/20 blur-[120px]"
      />

      {/* Badge */}
      <motion.div {...fadeUp} className="mb-6">
        <span className="chip-electric text-xs font-semibold px-4 py-1.5 rounded-full">
          Gratuit pendant 30 jours · Aucune CB requise
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        {...fadeUpDelay(0.08)}
        className="font-sans font-extrabold text-7xl sm:text-8xl leading-[1.05] tracking-tight text-white mb-6 max-w-4xl"
      >
        Stay Booked.
        <br />
        <span className="text-[#A78BFA]">Always.</span>
      </motion.h1>

      {/* Sous-titre */}
      <motion.p
        {...fadeUpDelay(0.16)}
        className="text-white/60 text-lg sm:text-xl max-w-2xl leading-relaxed mb-10"
      >
        La plateforme tout-en-un pour les barbers modernes. Réservations en
        ligne, acomptes Stripe, rappels automatiques.
      </motion.p>

      {/* CTAs */}
      <motion.div
        {...fadeUpDelay(0.24)}
        className="flex flex-col sm:flex-row gap-4 items-center justify-center"
      >
        <Link
          href="/auth"
          className="btn-electric flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base cursor-pointer hover:opacity-90 transition-opacity duration-200"
        >
          Rejoindre gratuitement
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/barbers"
          className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base border border-white/[0.12] text-white/80 hover:bg-white/[0.05] hover:text-white transition-all duration-200 cursor-pointer"
        >
          Voir une démo
          <ChevronRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   LOGOS / SOCIAL PROOF
───────────────────────────────────────────── */
const salons = [
  'Malik Cuts',
  'FadeZone',
  'La Barberie',
  'The Sharp Shop',
  'BarberX',
];

function SocialProof() {
  return (
    <section id="social-proof" className="py-16 px-6 border-y border-white/[0.06]">
      <div className="max-w-5xl mx-auto">
        <motion.p
          {...fadeUp}
          className="text-center text-xs font-semibold uppercase tracking-widest text-white/30 mb-10"
        >
          Ils nous font confiance
        </motion.p>
        <motion.div
          {...fadeUpDelay(0.1)}
          className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6"
        >
          {salons.map((name, i) => (
            <span
              key={name}
              className="font-bold text-lg text-white/20 hover:text-white/50 transition-colors duration-300 cursor-default tracking-tight"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {name}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FEATURES
───────────────────────────────────────────── */
const features = [
  {
    icon: Calendar,
    title: 'Réservation en 30s',
    desc: 'Vos clients réservent depuis leur téléphone en quelques secondes, sans appel.',
  },
  {
    icon: CreditCard,
    title: 'Acomptes Stripe',
    desc: 'Encaissez un acompte à la réservation. Finis les no-shows, bonjour la trésorerie.',
  },
  {
    icon: Bell,
    title: 'Notifications push',
    desc: 'Rappels automatiques par SMS et push 24h avant chaque rendez-vous.',
  },
  {
    icon: Star,
    title: 'Avis clients',
    desc: 'Collectez des avis après chaque prestation et boostez votre réputation.',
  },
  {
    icon: Users,
    title: 'Liste d\'attente',
    desc: 'Les créneaux annulés se remplissent automatiquement depuis la liste d\'attente.',
  },
  {
    icon: RefreshCw,
    title: 'Clients récurrents',
    desc: 'Re-booking automatique pour vos fidèles. Agenda plein sans effort.',
  },
];

function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="chip-electric text-xs font-semibold px-4 py-1.5 rounded-full mb-4 inline-block">
            Fonctionnalités
          </span>
          <h2 className="font-extrabold text-4xl sm:text-5xl text-white tracking-tight mt-4 mb-4">
            Tout ce dont un barber a besoin
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
            Une seule plateforme. Zéro friction. Plus de temps pour ce qui compte vraiment.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                  delay: i * 0.07,
                }}
                className="card p-6 flex flex-col gap-4 hover:bg-white/[0.07] transition-colors duration-300 cursor-default group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center group-hover:bg-[#7C3AED]/25 transition-colors duration-300">
                  <Icon className="w-5 h-5 text-[#A78BFA]" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base mb-1.5">{f.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   COMMENT ÇA MARCHE
───────────────────────────────────────────── */
const steps = [
  {
    num: '01',
    title: 'Créez votre profil',
    desc: 'Configurez vos services, tarifs et disponibilités en 5 minutes chrono.',
  },
  {
    num: '02',
    title: 'Partagez votre lien',
    desc: 'Un lien unique à partager sur Instagram, WhatsApp ou votre site vitrine.',
  },
  {
    num: '03',
    title: 'Gérez tout depuis le Studio',
    desc: 'Tableau de bord centralisé : agenda, paiements, avis et analytics.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="chip-electric text-xs font-semibold px-4 py-1.5 rounded-full mb-4 inline-block">
            Comment ça marche
          </span>
          <h2 className="font-extrabold text-4xl sm:text-5xl text-white tracking-tight mt-4 mb-4">
            Lancé en 3 étapes
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
            Pas de formation requise. Pas de complexité inutile. Juste des RDV.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Ligne de connexion (desktop) */}
          <div
            aria-hidden
            className="hidden md:block absolute top-8 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-px bg-gradient-to-r from-transparent via-[#7C3AED]/40 to-transparent"
          />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
              className="card p-7 flex flex-col items-start gap-4 relative"
            >
              <span className="font-extrabold text-4xl text-[#7C3AED]/30 leading-none">
                {step.num}
              </span>
              <div>
                <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PRICING
───────────────────────────────────────────── */
const plans = [
  {
    name: 'Gratuit',
    price: '0€',
    period: 'pour toujours',
    highlight: false,
    badge: null,
    features: [
      '1 barber / profil',
      'Jusqu\'à 30 RDV/mois',
      'Page de réservation publique',
      'Notifications email',
      'Support communautaire',
    ],
  },
  {
    name: 'Pro',
    price: '29€',
    period: 'par mois',
    highlight: true,
    badge: 'Populaire',
    features: [
      'RDV illimités',
      'Acomptes Stripe activés',
      'Rappels SMS automatiques',
      'Avis clients + réponses',
      'Liste d\'attente intelligente',
    ],
  },
  {
    name: 'Premium',
    price: '59€',
    period: 'par mois',
    highlight: false,
    badge: null,
    features: [
      'Tout le plan Pro',
      'Jusqu\'à 5 barbers / salon',
      'Analytics avancés',
      'Intégration Instagram DM',
      'Support prioritaire 24/7',
    ],
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="chip-electric text-xs font-semibold px-4 py-1.5 rounded-full mb-4 inline-block">
            Tarifs
          </span>
          <h2 className="font-extrabold text-4xl sm:text-5xl text-white tracking-tight mt-4 mb-4">
            Simple, transparent, sans surprise
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
            Commencez gratuitement. Évoluez quand vous êtes prêt.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
              className={`card p-7 flex flex-col gap-6 relative ${
                plan.highlight ? 'ring-2 ring-[#7C3AED]' : ''
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 chip-electric text-xs font-bold px-4 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}

              {/* En-tête */}
              <div>
                <p className="text-white/50 text-sm font-medium mb-2">{plan.name}</p>
                <div className="flex items-end gap-1.5">
                  <span className="font-extrabold text-4xl text-white">{plan.price}</span>
                  <span className="text-white/40 text-sm pb-1.5">/{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-sm text-white/70">
                    <Check
                      className="w-4 h-4 text-[#A78BFA] mt-0.5 shrink-0"
                      strokeWidth={2.5}
                    />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/auth"
                className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                  plan.highlight
                    ? 'btn-electric hover:opacity-90'
                    : 'border border-white/[0.12] text-white/70 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                Commencer
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   TESTIMONIALS
───────────────────────────────────────────── */
const testimonials = [
  {
    initials: 'MK',
    name: 'Malik Konaté',
    role: 'Barber indépendant · Paris',
    stars: 5,
    text: 'Depuis BookedUp, mon agenda est plein 2 semaines à l\'avance. Les acomptes ont réduit mes no-shows de 90%. Je recommande à tous les barbers.',
  },
  {
    initials: 'RD',
    name: 'Rayan Diouf',
    role: 'Gérant FadeZone · Lyon',
    stars: 5,
    text: 'J\'ai testé 3 autres applis avant. BookedUp est la seule qui comprend vraiment le métier de barber. Interface propre, setup en 10 minutes.',
  },
  {
    initials: 'AS',
    name: 'Amine Salhi',
    role: 'La Barberie · Bordeaux',
    stars: 5,
    text: 'La liste d\'attente automatique est une tuerie. Un client annule, un autre prend sa place immédiatement. Aucun créneau perdu.',
  },
];

function Testimonials() {
  return (
    <section id="testimonials" className="py-24 px-6 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-16">
          <span className="chip-electric text-xs font-semibold px-4 py-1.5 rounded-full mb-4 inline-block">
            Témoignages
          </span>
          <h2 className="font-extrabold text-4xl sm:text-5xl text-white tracking-tight mt-4">
            Ce que disent les barbers
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
              className="card p-6 flex flex-col gap-5"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, s) => (
                  <Star
                    key={s}
                    className="w-4 h-4 text-[#A78BFA] fill-[#A78BFA]"
                    strokeWidth={0}
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-white/70 text-sm leading-relaxed flex-1">"{t.text}"</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#7C3AED]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#A78BFA]">{t.initials}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">{t.name}</p>
                  <p className="text-white/40 text-xs leading-tight mt-0.5">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CTA FINAL
───────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section id="cta" className="py-24 px-6 border-t border-white/[0.06]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          {...fadeUp}
          className="card relative overflow-hidden p-12 sm:p-16 flex flex-col items-center text-center gap-8"
        >
          {/* Glow de fond */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="h-[400px] w-[400px] rounded-full bg-[#7C3AED]/15 blur-[100px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-6">
            <span className="chip-electric text-xs font-semibold px-4 py-1.5 rounded-full">
              Gratuit · Aucune CB requise
            </span>
            <h2 className="font-extrabold text-4xl sm:text-5xl text-white tracking-tight leading-[1.1]">
              Prêt à remplir<br />
              <span className="text-[#A78BFA]">ton agenda ?</span>
            </h2>
            <p className="text-white/60 text-lg max-w-md leading-relaxed">
              Rejoins les barbers qui ont arrêté de perdre des clients.
              Configure ton profil en 5 minutes.
            </p>
            <Link
              href="/auth"
              className="btn-electric flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base cursor-pointer hover:opacity-90 transition-opacity duration-200"
            >
              Rejoindre BookedUp gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-base text-white cursor-pointer"
        >
          <Scissors className="w-4 h-4 text-[#7C3AED]" strokeWidth={2.2} />
          <span>BookedUp</span>
        </Link>

        {/* Liens légaux */}
        <div className="flex items-center gap-6">
          {[
            { label: 'CGU', href: '/legal/terms' },
            { label: 'Confidentialité', href: '/legal/privacy' },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-white/40 hover:text-white/70 transition-colors duration-200 cursor-pointer"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-sm text-white/30">© 2025 BookedUp</p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   PAGE PRINCIPALE
───────────────────────────────────────────── */
export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[rgb(5,6,8)] font-sans antialiased">
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
