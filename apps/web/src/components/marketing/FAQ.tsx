'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

const FAQS = [
  {
    q: 'Combien de temps pour configurer BookedUp ?',
    a: 'Moins de 10 minutes. Tu crées ton compte, tu ajoutes tes services, tes horaires, et tu partages ton lien.',
  },
  {
    q: 'Comment fonctionne l’acompte ?',
    a: 'Tu choisis un montant fixe ou un pourcentage. À la réservation, le client paie via Stripe. Tu déduis l’acompte au moment du paiement final.',
  },
  {
    q: 'Que se passe-t-il en cas de no-show ?',
    a: 'L’acompte est conservé. BookedUp réduit les no-shows de ~70% en moyenne d’après nos données.',
  },
  {
    q: 'Puis-je annuler à tout moment ?',
    a: 'Oui. Aucun engagement, tu annules en un clic depuis ton dashboard. Tu gardes tes données.',
  },
  {
    q: 'Y a-t-il une app mobile ?',
    a: 'Oui — iOS et Android. Tu gères ton agenda, tu reçois des notifications, tu génères tes stories Instagram en un clic.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-5xl">FAQ</h2>
        <div className="mt-12 divide-y divide-white/10 rounded-2xl border border-white/10 bg-ink-800/40">
          {FAQS.map((f, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
              >
                <span className="font-medium">{f.q}</span>
                <Plus
                  className={`h-4 w-4 flex-none text-white/40 transition-transform ${open === i ? 'rotate-45 text-electric-400' : ''}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-sm leading-relaxed text-white/60">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
