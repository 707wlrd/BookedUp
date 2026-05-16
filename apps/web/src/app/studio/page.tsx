export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Sparkles, Star } from 'lucide-react';
import { PageHeader } from '@/components/studio/StatCard';
import { WelcomeBanner } from '@/components/studio/WelcomeBanner';
import { DashboardLive } from '@/components/studio/DashboardLive';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export default async function StudioOverviewPage({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/studio');

  // Fetch barber (stable data only — dynamic stats handled client-side)
  const { data: barber } = await supabase
    .from('barbers')
    .select('id, shop_name, rating_average, rating_count')
    .eq('owner_id', user.id)
    .single();

  if (!barber) redirect('/onboarding');

  // Recent reviews (last 14 days) — stable enough for SSR
  const { data: recentReviews } = await supabase
    .from('reviews')
    .select('id, rating, customer_name, comment, created_at')
    .eq('barber_id', barber.id)
    .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString())
    .order('created_at', { ascending: false })
    .limit(3);

  const reviews        = recentReviews ?? [];
  const newReviewCount = reviews.length;

  return (
    <>
      {/* Welcome banner on first visit */}
      {searchParams.welcome === '1' ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-electric-500/20 bg-electric-500/[0.06] px-5 py-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-electric-400" />
          <div>
            <div className="font-semibold text-electric-200">Bienvenue sur ton Studio 🎉</div>
            <div className="mt-0.5 text-sm text-white/50">
              Ton salon est en ligne. Partage ta page{' '}
              <Link href="/studio/settings" className="text-electric-400 underline underline-offset-2">
                dès maintenant
              </Link>.
            </div>
          </div>
        </div>
      ) : (
        <WelcomeBanner />
      )}

      <PageHeader title="Aujourd'hui" subtitle="Ton activité en un coup d'œil." />

      {/* ── New reviews alert (SSR) ── */}
      {newReviewCount > 0 && (
        <Link href="/studio/reviews"
          className="mb-4 flex items-center gap-3 rounded-2xl border border-spark-500/20 bg-spark-500/[0.05] px-5 py-3.5 transition hover:bg-spark-500/[0.09]">
          <Star className="h-5 w-5 shrink-0 fill-spark-400 text-spark-400" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-spark-200">{newReviewCount} nouvel avis</span>
            <span className="text-white/45"> reçu{newReviewCount > 1 ? 's' : ''} ces 14 derniers jours</span>
          </div>
          <ArrowRight className="h-4 w-4 text-white/30" />
        </Link>
      )}

      {/* ── Live stats (KPI + programme + prochain RDV + semaine) ── */}
      <DashboardLive barberId={barber.id} />

      {/* ── Static cards (rating + AI CTA) ── */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {barber.rating_count > 0 && (
          <Link href="/studio/reviews" className="card card-hover group block p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="label">Note moyenne</div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold">{Number(barber.rating_average).toFixed(1)}</span>
                  <Star className="h-4 w-4 fill-spark-400 text-spark-400" />
                </div>
                <div className="mt-0.5 text-xs text-white/35">{barber.rating_count} avis</div>
              </div>
              <ArrowRight className="h-4 w-4 text-white/20 transition group-hover:text-white/60" />
            </div>
          </Link>
        )}
        <Link href="/studio/ai" className="card card-hover group block overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="label">AI Studio</div>
              <div className="mt-2 text-base font-semibold">Générer du contenu</div>
              <div className="mt-1 text-xs text-white/45">Captions, stories, rappels</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-spark-500/15 text-spark-400 transition group-hover:bg-spark-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
