'use client';
import { motion } from 'framer-motion';

const QUOTES = [
  {
    name: 'Malik — Malik Cuts, Paris',
    quote:
      "Depuis BookedUp, j'ai zéro no-show et 30% de RDV en plus. Les clients réservent à 2h du mat', je m'en occupe le matin.",
  },
  {
    name: 'Samir — Samir Studio, Lyon',
    quote:
      "L'IA me fait mes stories Instagram automatiquement. Je gagne 5h par semaine, sérieux.",
  },
  {
    name: 'Léo — Sharp Cuts, Bordeaux',
    quote:
      'Le dashboard est ultra-clean. Je vois mon CA en temps réel, j’ai compris où je perdais de l’argent.',
  },
];

export function Testimonials() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-5xl">
          Les barbers qui restent <span className="gradient-text">booked.</span>
        </h2>
        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <motion.figure
              key={q.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="card p-6"
            >
              <blockquote className="text-sm leading-relaxed text-white/80">"{q.quote}"</blockquote>
              <figcaption className="mt-4 text-xs text-white/40">{q.name}</figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
