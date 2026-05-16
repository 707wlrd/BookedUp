export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { Wallet, TrendingUp, CreditCard, RefreshCw } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/studio/StatCard';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, cn } from '@/lib/utils';

type Appt = {
  id: string;
  customer_name: string;
  customer_email: string;
  price_cents: number;
  deposit_cents: number;
  payment_status: string;
  status: string;
  starts_at: string;
  recurring_series_id: string | null;
  services: { name: string } | null;
};

export default async function PaymentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/studio/payments');

  const { data: barber } = await supabase
    .from('barbers')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  if (!barber) redirect('/onboarding');

  // ── Date ranges ────────────────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd   = new Date(monthStart.getTime() - 1);

  // ── Parallel fetches ────────────────────────────────────────────────────────
  const [
    { data: monthAppts },
    { data: prevMonthAppts },
    { data: transactions },
  ] = await Promise.all([
    // This month revenue
    supabase
      .from('appointments')
      .select('price_cents, deposit_cents, payment_status, status')
      .eq('barber_id', barber.id)
      .gte('starts_at', monthStart.toISOString())
      .in('status', ['confirmed', 'completed']),

    // Previous month (for delta)
    supabase
      .from('appointments')
      .select('price_cents')
      .eq('barber_id', barber.id)
      .gte('starts_at', prevMonthStart.toISOString())
      .lte('starts_at', prevMonthEnd.toISOString())
      .in('status', ['confirmed', 'completed']),

    // Transactions with deposit or paid status
    supabase
      .from('appointments')
      .select('id, customer_name, customer_email, price_cents, deposit_cents, payment_status, status, starts_at, recurring_series_id, services(name)')
      .eq('barber_id', barber.id)
      .order('starts_at', { ascending: false })
      .limit(50),
  ]);

  const month     = monthAppts ?? [];
  const prevMonth = prevMonthAppts ?? [];
  const txns      = (transactions ?? []) as Appt[];

  // ── Computed stats ──────────────────────────────────────────────────────────
  const monthRevenue  = month.reduce((s, a) => s + a.price_cents, 0);
  const prevRevenue   = prevMonth.reduce((s, a) => s + a.price_cents, 0);
  const monthDelta    = prevRevenue > 0
    ? Math.round(((monthRevenue - prevRevenue) / prevRevenue) * 100)
    : null;

  const depositsCount     = month.filter(a => a.deposit_cents > 0 && a.payment_status === 'paid').length;
  const depositsPending   = month.filter(a => a.deposit_cents > 0 && a.payment_status !== 'paid').length;
  const totalDeposits     = month.filter(a => a.payment_status === 'paid').reduce((s, a) => s + a.deposit_cents, 0);
  const refundedCount     = txns.filter(a => a.payment_status === 'refunded').length;
  const refundedAmount    = txns.filter(a => a.payment_status === 'refunded').reduce((s, a) => s + a.deposit_cents, 0);

  // Only show appointments with financial activity (deposit or full price)
  const relevantTxns = txns.filter(a =>
    a.deposit_cents > 0 || a.payment_status === 'paid' || a.payment_status === 'refunded'
  );

  return (
    <>
      <PageHeader
        title="Paiements"
        subtitle="Acomptes, encaissements et remboursements en temps réel."
      />

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          Icon={TrendingUp}
          label="CA du mois"
          value={formatPrice(monthRevenue)}
          delta={monthDelta !== null ? `${monthDelta >= 0 ? '+' : ''}${monthDelta}% vs mois préc.` : undefined}
          highlight={monthRevenue > 0}
        />
        <StatCard
          Icon={CreditCard}
          label="Acomptes encaissés"
          value={String(depositsCount)}
          hint={depositsPending > 0 ? `${depositsPending} en attente` : 'ce mois'}
        />
        <StatCard
          Icon={Wallet}
          label="Encaissé (dépôts)"
          value={formatPrice(totalDeposits)}
          hint="ce mois"
        />
        <StatCard
          Icon={RefreshCw}
          label="Remboursements"
          value={String(refundedCount)}
          hint={refundedCount > 0 ? formatPrice(refundedAmount) : 'aucun ce mois'}
        />
      </div>

      {/* ── Transactions table ── */}
      <div className="mt-8 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="font-semibold">Transactions récentes</div>
          <div className="text-xs text-white/40">{txns.length} RDV au total</div>
        </div>

        {relevantTxns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Wallet className="h-8 w-8 text-white/10" />
            <p className="text-sm text-white/35">Aucun paiement enregistré.</p>
            <p className="text-xs text-white/25">Les acomptes Stripe apparaîtront ici.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-white/[0.05] text-left">
                  <tr>
                    {['Client', 'Service', 'Type', 'Montant', 'Date', 'Statut'].map(h => (
                      <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relevantTxns.map((t) => {
                    const kind = t.payment_status === 'refunded' ? 'refund'
                      : t.deposit_cents > 0 ? 'deposit' : 'payment';
                    const amount = kind === 'refund' ? t.deposit_cents
                      : kind === 'deposit' ? t.deposit_cents : t.price_cents;
                    const isPaid = t.payment_status === 'paid';
                    const isPending = t.payment_status === 'pending';

                    return (
                      <tr key={t.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                        <td className="px-5 py-3.5">
                          <div className="font-medium">{t.customer_name}</div>
                          <div className="text-xs text-white/35">{t.customer_email}</div>
                        </td>
                        <td className="px-5 py-3.5 text-white/50 text-xs">
                          <div>{(t.services as any)?.name ?? '—'}</div>
                          {t.recurring_series_id && (
                            <span className="inline-flex items-center gap-1 mt-1 rounded-full border border-electric-500/20 bg-electric-500/[0.06] px-1.5 py-0.5 text-[9px] text-electric-300">
                              <RefreshCw className="h-2 w-2" /> Récurrent
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            'chip text-[11px]',
                            kind === 'refund'  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' :
                            kind === 'deposit' ? 'border-electric-500/30 bg-electric-500/10 text-electric-300' :
                                                'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                          )}>
                            {kind === 'refund' ? 'Remboursement' : kind === 'deposit' ? 'Acompte' : 'Paiement'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold tabular-nums">
                          {kind === 'refund' ? (
                            <span className="text-amber-300">−{formatPrice(amount)}</span>
                          ) : (
                            formatPrice(amount)
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-white/50 text-xs">
                          {new Date(t.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            'chip text-[10px]',
                            isPaid    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' :
                            isPending ? 'border-white/10 bg-white/[0.03] text-white/40' :
                                        'border-amber-500/30 bg-amber-500/10 text-amber-300',
                          )}>
                            {isPaid ? 'Encaissé' : isPending ? 'En attente' : 'Remboursé'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-white/[0.05] md:hidden">
              {relevantTxns.map((t) => {
                const kind = t.payment_status === 'refunded' ? 'refund'
                  : t.deposit_cents > 0 ? 'deposit' : 'payment';
                const amount = kind === 'refund' ? t.deposit_cents
                  : kind === 'deposit' ? t.deposit_cents : t.price_cents;
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.customer_name}</div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-xs text-white/35">
                          {new Date(t.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className={cn(
                          'chip text-[10px]',
                          kind === 'refund'  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' :
                          kind === 'deposit' ? 'border-electric-500/30 bg-electric-500/10 text-electric-300' :
                                              'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                        )}>
                          {kind === 'refund' ? 'Remb.' : kind === 'deposit' ? 'Acompte' : 'Paiement'}
                        </span>
                      </div>
                    </div>
                    <div className={cn('font-bold tabular-nums shrink-0', kind === 'refund' ? 'text-amber-300' : 'text-white')}>
                      {kind === 'refund' ? '−' : ''}{formatPrice(amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Stripe note ── */}
      <p className="mt-4 text-center text-xs text-white/25">
        Les paiements Stripe apparaissent automatiquement après encaissement de l'acompte.
      </p>
    </>
  );
}
