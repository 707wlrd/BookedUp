'use client';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { PLANS } from '@bookedup/shared';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const ORDER = ['free', 'pro', 'premium'] as const;

export function Pricing({ standalone = false }: { standalone?: boolean }) {
  const t = useTranslations('pricing');
  return (
    <section id="pricing" className={cn('py-24 sm:py-32', !standalone && 'border-t border-white/5')}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{t('title')}</h2>
          <p className="mt-4 text-white/55">{t('subtitle')}</p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {ORDER.map((key, i) => {
            const plan = PLANS[key];
            const highlighted = key === 'pro';
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={cn(
                  'card relative p-8',
                  highlighted && 'border-electric-500/40 shadow-glow',
                )}
              >
                {highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-electric-500 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Le plus populaire
                  </span>
                )}
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight">{plan.price_eur}€</span>
                  <span className="text-sm text-white/40">/ mois</span>
                </div>

                <Button
                  href={`/register?plan=${key}`}
                  variant={highlighted ? 'primary' : 'ghost'}
                  className="mt-6 w-full"
                  size="lg"
                >
                  {key === 'free' ? 'Commencer' : 'Choisir ce plan'}
                </Button>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-electric-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
