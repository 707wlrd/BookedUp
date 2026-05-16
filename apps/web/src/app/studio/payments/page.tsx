import { PageHeader, StatCard } from '@/components/studio/StatCard';
import { formatPrice } from '@/lib/utils';

const TXN = [
  { id: 'pi_001', name: 'Karim L.',  amount: 1000, kind: 'deposit',  when: '2026-05-15T08:12' },
  { id: 'pi_002', name: 'Yanis R.',  amount: 2500, kind: 'payment',  when: '2026-05-14T17:30' },
  { id: 'pi_003', name: 'Hugo M.',   amount: 1000, kind: 'deposit',  when: '2026-05-14T15:02' },
  { id: 'pi_004', name: 'Léo M.',    amount: 3500, kind: 'payment',  when: '2026-05-13T18:21' },
  { id: 'pi_005', name: 'Tarek B.',  amount: 1000, kind: 'refund',   when: '2026-05-12T11:00' },
];

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Paiements" subtitle="Acomptes, encaissements, remboursements." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="CA mois"   value="6 840 €" delta="+22%" hint="vs mois dernier" highlight />
        <StatCard label="Acomptes"  value="32"      hint="en cours" />
        <StatCard label="Encaissé"  value="5 320 €" hint="ce mois" />
        <StatCard label="Remboursé" value="40 €"    hint="ce mois" />
      </div>

      <div className="mt-10 card overflow-hidden">
        <div className="border-b border-white/5 p-5 font-semibold">Transactions récentes</div>
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-white/40">
            <tr>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Montant</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">ID Stripe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {TXN.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 font-medium">{t.name}</td>
                <td className="px-5 py-3">
                  <span
                    className={
                      t.kind === 'refund'
                        ? 'chip text-amber-300 border-amber-500/30 bg-amber-500/10'
                        : t.kind === 'deposit'
                          ? 'chip text-electric-300'
                          : 'chip text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                    }
                  >
                    {t.kind === 'refund' ? 'Remboursement' : t.kind === 'deposit' ? 'Acompte' : 'Paiement'}
                  </span>
                </td>
                <td className="px-5 py-3 font-semibold">{formatPrice(t.amount)}</td>
                <td className="px-5 py-3 text-white/60">
                  {new Date(t.when).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-white/35">{t.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
