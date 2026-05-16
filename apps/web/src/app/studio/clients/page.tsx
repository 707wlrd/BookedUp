import { Mail, Phone, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/studio/StatCard';
import { formatPrice } from '@/lib/utils';

const CLIENTS = [
  { name: 'Karim Larbi',   email: 'karim@mail.fr',  phone: '06 12 34 56 78', visits: 14, ltv: 49000, last: '2026-05-10' },
  { name: 'Yanis Rouhani', email: 'yanis@mail.fr',  phone: '06 22 33 44 55', visits: 8,  ltv: 22000, last: '2026-05-09' },
  { name: 'Hugo Marais',   email: 'hugo@mail.fr',   phone: '06 88 77 66 55', visits: 22, ltv: 77000, last: '2026-05-12' },
  { name: 'Léo Martin',    email: 'leo@mail.fr',    phone: '06 99 88 77 66', visits: 3,  ltv: 9000,  last: '2026-04-20' },
];

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Clients" subtitle={`${CLIENTS.length} clients enregistrés`} actions={<input className="input max-w-xs" placeholder="Rechercher…" />} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CLIENTS.map((c) => (
          <div key={c.email} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="mt-1 flex items-center gap-3 text-xs text-white/45">
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-white"><Mail className="h-3 w-3" />{c.email}</a>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                </div>
              </div>
              <button className="btn-ghost text-xs"><Calendar className="h-3 w-3" />Nouveau RDV</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-4 text-xs">
              <Stat label="Visites" value={String(c.visits)} />
              <Stat label="LTV"     value={formatPrice(c.ltv)} />
              <Stat label="Dernier" value={new Date(c.last).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}
