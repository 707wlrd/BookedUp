'use client';
import { motion } from 'framer-motion';
import { Clock, Bell, CreditCard, MapPin, Sparkles } from 'lucide-react';

export function WhyBento() {
  return (
    <section className="border-t border-white/[0.06] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="label">Pourquoi BookedUp</p>
          <h2 className="mt-3 text-display-md">
            Conçu pour que tu sois <span className="gradient-text">toujours fresh.</span>
          </h2>
        </div>

        <div className="bento auto-rows-[140px] sm:auto-rows-[180px]">
          {/* Big card: real-time */}
          <BentoCard className="col-span-12 md:col-span-8 md:row-span-2" delay={0}>
            <div className="flex h-full flex-col justify-between">
              <div>
                <Clock className="h-6 w-6 text-electric-300" />
                <h3 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                  Les vrais créneaux. <span className="gradient-text">En temps réel.</span>
                </h3>
                <p className="mt-3 max-w-md text-sm text-white/55">
                  Tu vois exactement quand ton coiffeur est dispo. Pas de "rappelle-moi demain". Tu cliques, c'est réservé.
                </p>
              </div>
              <SlotPreview />
            </div>
          </BentoCard>

          {/* Reminders */}
          <BentoCard className="col-span-12 md:col-span-4" delay={0.05}>
            <Bell className="h-5 w-5 text-electric-300" />
            <h3 className="mt-3 text-lg font-semibold">Rappels SMS</h3>
            <p className="mt-1 text-sm text-white/55">
              Tu reçois un rappel la veille. Zéro RDV oublié.
            </p>
          </BentoCard>

          {/* Payment */}
          <BentoCard className="col-span-12 md:col-span-4" delay={0.1}>
            <CreditCard className="h-5 w-5 text-spark-400" />
            <h3 className="mt-3 text-lg font-semibold">Acompte en 1 clic</h3>
            <p className="mt-1 text-sm text-white/55">
              Apple Pay, Google Pay, CB. Sécurisé par Stripe.
            </p>
          </BentoCard>

          {/* Nearby */}
          <BentoCard className="col-span-12 md:col-span-6" delay={0.15}>
            <div className="flex items-start gap-4">
              <MapPin className="mt-1 h-5 w-5 flex-none text-electric-300" />
              <div>
                <h3 className="text-lg font-semibold">Près de chez toi</h3>
                <p className="mt-1 text-sm text-white/55">
                  Filtre par distance, style, prix. Trouve la pépite de ton quartier.
                </p>
              </div>
            </div>
          </BentoCard>

          {/* AI assistance */}
          <BentoCard className="col-span-12 md:col-span-6 overflow-hidden" delay={0.2}>
            <div className="flex items-start gap-4">
              <Sparkles className="mt-1 h-5 w-5 flex-none text-spark-400" />
              <div>
                <h3 className="text-lg font-semibold">Le bon choix, à coup sûr</h3>
                <p className="mt-1 text-sm text-white/55">
                  Portfolio, avis, photos before/after. Tu sais ce que tu vas avoir.
                </p>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  className = '', children, delay = 0,
}: { className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      className={`card card-glow card-hover p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SlotPreview() {
  const slots = [
    { day: 'Jeu', time: '14:00', taken: true },
    { day: 'Jeu', time: '14:30', taken: false },
    { day: 'Jeu', time: '15:00', taken: false, highlight: true },
    { day: 'Jeu', time: '15:30', taken: true },
    { day: 'Jeu', time: '16:00', taken: false },
    { day: 'Jeu', time: '16:30', taken: false },
  ];
  return (
    <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {slots.map((s, i) => (
        <div
          key={i}
          className={
            'rounded-lg border px-2 py-2 text-center text-xs transition ' +
            (s.taken
              ? 'border-white/[0.05] bg-white/[0.02] text-white/25 line-through'
              : s.highlight
                ? 'border-electric-500/50 bg-electric-500/15 text-white shadow-glow'
                : 'border-white/10 bg-white/[0.03] text-white/75')
          }
        >
          {s.time}
        </div>
      ))}
    </div>
  );
}
