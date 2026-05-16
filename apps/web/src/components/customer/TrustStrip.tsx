import { Shield, Zap, RotateCcw, Lock } from 'lucide-react';

const ITEMS = [
  { Icon: Zap,     title: 'Réservation 30s',    text: 'Pas de coup de fil, pas d\'attente.' },
  { Icon: Lock,    title: 'Paiement sécurisé',  text: 'Acomptes Stripe, données chiffrées.' },
  { Icon: Shield,  title: 'Barbers vérifiés',  text: 'Profils, portfolios et avis authentiques.' },
  { Icon: RotateCcw, title: 'Annulation gratuite', text: 'Jusqu\'à 24h avant ton RDV.' },
];

export function TrustStrip() {
  return (
    <section className="border-y border-white/[0.06] bg-ink-900/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden md:grid-cols-4">
        {ITEMS.map((it) => (
          <div
            key={it.title}
            className="group flex items-start gap-3 bg-ink-950/60 px-6 py-6 transition hover:bg-ink-800/30"
          >
            <div className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-electric-500/10 text-electric-300 transition group-hover:bg-electric-500/20">
              <it.Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">{it.title}</div>
              <div className="mt-0.5 text-xs text-white/45">{it.text}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
