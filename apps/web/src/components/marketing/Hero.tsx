'use client';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Hero() {
  const t = useTranslations('hero');
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-faint" />
      <div className="absolute inset-x-0 top-0 h-[640px] bg-glow-blue" />

      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-32 sm:pt-32 sm:pb-40">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-electric-500/30 bg-electric-500/10 px-3 py-1 text-xs font-medium text-electric-200">
            <Sparkles className="h-3.5 w-3.5" />
            {t('badge')}
          </div>

          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            <span className="gradient-text">{t('title')}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-white/60 sm:text-lg">
            {t('subtitle')}
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <Button href="/register?role=barber" size="lg">
              {t('cta_primary')} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/pro/pricing" variant="ghost" size="lg">
              {t('cta_secondary')}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <div className="card overflow-hidden p-2 shadow-2xl">
            <div className="rounded-xl bg-gradient-to-br from-ink-800 to-ink-900 p-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <PreviewCard label="Aujourd'hui" value="12 RDV" sub="+18% vs hier" />
                <PreviewCard label="Revenus" value="438 €" sub="6 acomptes encaissés" highlight />
                <PreviewCard label="No-shows" value="0" sub="depuis 7 jours" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PreviewCard({
  label,
  value,
  sub,
  highlight,
}: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'border-electric-500/30 bg-electric-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="label">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-white/40">{sub}</div>
    </div>
  );
}
