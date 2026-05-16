'use client';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CTA() {
  const t = useTranslations('cta');
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-electric-500/20 bg-gradient-to-br from-electric-900/40 via-ink-800 to-ink-900 p-12 sm:p-20">
        <div className="absolute inset-0 bg-glow-blue opacity-40" />
        <div className="relative text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            <span className="gradient-text">{t('title')}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">{t('subtitle')}</p>
          <div className="mt-8 flex justify-center">
            <Button href="/register" size="lg">
              Créer mon compte <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
