import Link from 'next/link';
import { Calendar, Star, Heart } from 'lucide-react';
import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';

// Mock — wire to Supabase: select * from appointments where customer_id = auth.uid().
const UPCOMING = [
  { id: '1', when: '2026-05-20T15:30:00', shop: 'Malik Cuts', service: 'Fade + barbe', price_cents: 3500, status: 'confirmed' },
];
const PAST = [
  { id: '2', when: '2026-04-22T11:00:00', shop: 'Malik Cuts', service: 'Coupe classique', price_cents: 2500, reviewed: false },
  { id: '3', when: '2026-03-15T16:00:00', shop: 'Samir Studio', service: 'Coupe homme', price_cents: 2200, reviewed: true },
];

export default function CustomerDashboardPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Mes RDV</h1>
            <p className="mt-1 text-sm text-white/55">Gère tes prochains rendez-vous.</p>
          </div>
          <Button href="/barbers"><Calendar className="h-4 w-4" />Nouveau RDV</Button>
        </div>

        <section className="mt-10">
          <h2 className="label">À venir</h2>
          <div className="mt-3 space-y-2">
            {UPCOMING.length === 0 && (
              <div className="card p-8 text-center text-sm text-white/40">Aucun RDV à venir.</div>
            )}
            {UPCOMING.map((a) => (
              <div key={a.id} className="card flex items-center justify-between p-5">
                <div>
                  <div className="font-medium">{a.service} chez {a.shop}</div>
                  <div className="mt-1 text-xs text-white/45">
                    {new Date(a.when).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="chip text-electric-300">{a.status === 'confirmed' ? 'Confirmé' : a.status}</span>
                  <span className="text-sm font-semibold">{formatPrice(a.price_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="label">Historique</h2>
          <div className="mt-3 space-y-2">
            {PAST.map((a) => (
              <div key={a.id} className="card flex items-center justify-between p-5">
                <div>
                  <div className="font-medium">{a.service} chez {a.shop}</div>
                  <div className="mt-1 text-xs text-white/45">
                    {new Date(a.when).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {a.reviewed ? (
                    <span className="chip"><Heart className="h-3 w-3" />Avis laissé</span>
                  ) : (
                    <Link href={`#review-${a.id}`} className="btn-ghost text-xs">
                      <Star className="h-3 w-3" /> Laisser un avis
                    </Link>
                  )}
                  <span className="font-semibold">{formatPrice(a.price_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
