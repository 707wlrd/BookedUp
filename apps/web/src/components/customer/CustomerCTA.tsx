'use client';
import Link from 'next/link';
import { ArrowRight, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CustomerCTA() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-electric-500/20 p-12 sm:p-20">
        <div className="absolute inset-0 bg-gradient-to-br from-electric-900/40 via-ink-800 to-ink-900" />
        <div className="absolute inset-0 bg-glow-blue opacity-50" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-electric-400/40 to-transparent" />

        <div className="relative text-center">
          <h2 className="text-display-lg">
            <span className="gradient-text">Prêt à réserver ?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Plus de 200 barbers, partout en France. Ton prochain fresh cut est à 30 secondes d'ici.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/barbers" size="lg">
              Trouver un barber <ArrowRight className="h-4 w-4" />
            </Button>
            <Link
              href="/pro"
              className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
            >
              <Briefcase className="h-3.5 w-3.5" />
              Je suis barber — découvrir BookedUp Pro
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
