'use client';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  CalendarDays,
  CreditCard,
  Clock,
  Sparkles,
  Users,
  BarChart3,
} from 'lucide-react';

const ITEMS = [
  { key: 'bookings',  Icon: CalendarDays },
  { key: 'deposits',  Icon: CreditCard },
  { key: 'calendar',  Icon: Clock },
  { key: 'ai',        Icon: Sparkles },
  { key: 'clients',   Icon: Users },
  { key: 'analytics', Icon: BarChart3 },
] as const;

export function Features() {
  const t = useTranslations('features');
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-5xl">
          {t('title')}
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ key, Icon }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="card group p-6 transition hover:border-electric-500/30"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-electric-500/10 text-electric-300 transition group-hover:bg-electric-500/20">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{t(`items.${key}.t`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{t(`items.${key}.d`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
