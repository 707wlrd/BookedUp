'use client';
import { motion } from 'framer-motion';
import { Search, CalendarCheck, Scissors } from 'lucide-react';

const STEPS = [
  {
    Icon: Search,
    title: 'Trouve ton barber',
    text: 'Filtre par ville, style, prix. Découvre les avis et le portfolio.',
  },
  {
    Icon: CalendarCheck,
    title: 'Réserve en ligne',
    text: 'Créneau, acompte en un clic. Confirmation instantanée.',
  },
  {
    Icon: Scissors,
    title: 'Tu es fresh',
    text: 'Présente-toi à l\'heure, profite, laisse ton avis.',
  },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="border-t border-white/[0.06] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="label">Comment ça marche</p>
          <h2 className="mt-3 text-display-md">
            Trois étapes. <span className="gradient-text">Zéro stress.</span>
          </h2>
        </div>

        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Connector line on md+ */}
          <div className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-[44px] hidden h-px bg-gradient-to-r from-electric-500/0 via-electric-500/30 to-electric-500/0 md:block" />

          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative"
            >
              <div className="card card-hover p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-electric-500/30 bg-electric-500/10 text-electric-300">
                    <s.Icon className="h-5 w-5" />
                  </div>
                  <span className="text-4xl font-black text-white/[0.06] tabular-nums">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{s.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
