export const dynamic = 'force-dynamic';

import { Mail, Phone, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/studio/StatCard';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, cn } from '@/lib/utils';
import { redirect } from 'next/navigation';

interface ClientRow {
  name: string;
  email: string;
  phone: string | null;
  visits: number;
  ltv: number;          // total price_cents
  last: string;         // ISO date of last appointment
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

export default async function ClientsPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/studio/clients');

  /* Get barber */
  const { data: barber } = await supabase
    .from('barbers')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!barber) return <p className="p-8 text-white/40">Profil coiffeur introuvable.</p>;

  /* Fetch all appointments for this barber */
  const { data: appts } = await supabase
    .from('appointments')
    .select('customer_name, customer_email, customer_phone, price_cents, starts_at')
    .eq('barber_id', barber.id)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: false });

  /* Aggregate by email */
  const map = new Map<string, ClientRow>();
  for (const a of appts ?? []) {
    const key = a.customer_email?.toLowerCase() ?? '';
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.visits += 1;
      existing.ltv    += a.price_cents ?? 0;
      // last is already the most recent (ordered desc)
    } else {
      map.set(key, {
        name:   a.customer_name ?? key,
        email:  a.customer_email,
        phone:  a.customer_phone ?? null,
        visits: 1,
        ltv:    a.price_cents ?? 0,
        last:   a.starts_at,
      });
    }
  }

  const clients = Array.from(map.values()).sort((a, b) => b.visits - a.visits);

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length > 1 ? 's' : ''} enregistré${clients.length > 1 ? 's' : ''}`}
      />

      {clients.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 text-white/15 text-5xl">👤</div>
          <p className="text-sm font-medium text-white/50">Aucun client pour l'instant.</p>
          <p className="mt-1 text-xs text-white/30">Les clients apparaîtront ici après leur premier RDV.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {clients.map((c) => (
            <div key={c.email} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-white truncate">
                      <Mail className="h-3 w-3 flex-none" />{c.email}
                    </a>
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 flex-none" />{c.phone}
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={`/studio/appointments`}
                  className="ml-3 flex-none inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <Calendar className="h-3 w-3" />Nouveau RDV
                </a>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-4 text-xs">
                <Stat label="Visites" value={String(c.visits)} />
                <Stat label="Total"   value={formatPrice(c.ltv)} />
                <Stat
                  label="Dernier"
                  value={new Date(c.last).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
