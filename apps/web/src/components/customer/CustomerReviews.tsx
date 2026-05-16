'use client';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const REVIEWS = [
  { name: 'Karim L.',  city: 'Paris',     rating: 5, text: 'Réservé en 30 secondes, fade nickel. Le rappel SMS est top, je l\'ai bien briefé.' },
  { name: 'Yanis R.',  city: 'Lyon',      rating: 5, text: 'Plus besoin d\'appeler 15 fois. Je vois les dispos en live, je choisis, j\'y vais.' },
  { name: 'Hugo M.',   city: 'Marseille', rating: 5, text: 'Le portfolio des barbers est ouf, tu vois exactement ce que tu vas avoir.' },
];

export function CustomerReviews() {
  return (
    <section id="avis" className="border-t border-white/[0.06] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="label">Avis clients</p>
          <h2 className="mt-3 text-display-md">
            Ils ont réservé sur <span className="gradient-text">BookedUp.</span>
          </h2>
          <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-sm text-white/55">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-electric-400 text-electric-400" />
              ))}
            </div>
            <span className="font-semibold text-white">4.9 / 5</span>
            <span className="text-white/40">· 1 200+ avis</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <motion.figure
              key={r.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
              }}
              className="card card-glow card-hover relative p-6"
            >
              <Quote className="absolute right-5 top-5 h-5 w-5 text-white/10" />
              <div className="flex gap-0.5">
                {Array.from({ length: r.rating }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-electric-400 text-electric-400" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-white/80">
                "{r.text}"
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-electric-500/30 to-electric-700/30 text-xs font-bold text-electric-100">
                  {r.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                </div>
                <div className="text-xs">
                  <div className="font-medium text-white">{r.name}</div>
                  <div className="text-white/40">{r.city}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
