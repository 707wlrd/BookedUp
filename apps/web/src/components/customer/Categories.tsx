'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Scissors, User, Palette, Sparkles, type LucideIcon } from 'lucide-react';

type Category = { label: string; query: string; Icon: LucideIcon; tint: string };

const CATEGORIES: Category[] = [
  { label: 'Coupe homme', query: 'coupe',     Icon: Scissors, tint: 'from-electric-500/20 to-electric-500/0' },
  { label: 'Barbe',       query: 'barbe',     Icon: User,     tint: 'from-spark-500/20 to-spark-500/0' },
  { label: 'Fade',        query: 'fade',      Icon: Sparkles, tint: 'from-electric-500/20 to-electric-500/0' },
  { label: 'Design',      query: 'design',    Icon: Palette,  tint: 'from-spark-500/20 to-spark-500/0' },
];

export function Categories() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="label">Catégories</p>
            <h2 className="mt-2 text-display-md">Trouve ce que tu cherches.</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link
                href={`/barbers?q=${c.query}`}
                className="card card-hover group relative block aspect-[5/4] overflow-hidden p-5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${c.tint} opacity-60 transition-opacity duration-200 group-hover:opacity-100`} />
                <div className="relative flex h-full flex-col justify-between">
                  <c.Icon className="h-6 w-6 text-electric-300 transition-transform duration-200 group-hover:scale-110" />
                  <div>
                    <div className="text-base font-semibold">{c.label}</div>
                    <div className="mt-0.5 text-xs text-white/40">Voir les coiffeurs →</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
