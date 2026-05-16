export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Star, MapPin, Instagram, BadgeCheck, Clock, ChevronRight, Shield, Users } from 'lucide-react';
import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { MobileBookingBar } from '@/components/booking/MobileBookingBar';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, formatDuration, cn } from '@/lib/utils';

// ── Shared helpers ─────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
const RATING_LABELS = ['', 'Mauvais', 'Bof', 'Bien', 'Très bien', 'Excellent'];
const RATING_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-300', 'text-green-400', 'text-emerald-400'];

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from('barbers')
    .select('shop_name, bio, city, avatar_url, rating_average, rating_count')
    .eq('slug', params.slug)
    .single();
  if (!data) return {};

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr';
  const title   = `${data.shop_name} — Réserver en ligne | BookedUp`;
  const description =
    data.bio ??
    `Réservez chez ${data.shop_name}${data.city ? ` à ${data.city}` : ''}. Note ${data.rating_average?.toFixed(1) ?? '5'}/5 sur BookedUp.`;

  return {
    title,
    description,
    alternates: { canonical: `${appUrl}/barbers/${params.slug}` },
    openGraph: {
      title,
      description,
      url:      `${appUrl}/barbers/${params.slug}`,
      siteName: 'BookedUp',
      type:     'website',
      ...(data.avatar_url ? { images: [{ url: data.avatar_url, width: 400, height: 400 }] } : {}),
    },
    twitter: {
      card:        'summary',
      title,
      description,
      ...(data.avatar_url ? { images: [data.avatar_url] } : {}),
    },
  };
}

export default async function BarberProfilePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { service?: string };
}) {
  const supabase = createClient();

  /* ── Fetch barber ── */
  const { data: barber } = await supabase
    .from('barbers')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!barber) notFound();

  /* ── Fetch services ── */
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('barber_id', barber.id)
    .eq('is_active', true)
    .order('sort_order');

  /* ── Fetch stylists ── */
  const { data: stylists } = await supabase
    .from('stylists')
    .select('id, name, bio, avatar_url, specialties')
    .eq('barber_id', barber.id)
    .eq('is_active', true)
    .order('sort_order');

  /* ── Fetch portfolio ── */
  const { data: portfolio } = await supabase
    .from('portfolio_items')
    .select('image_url, caption')
    .eq('barber_id', barber.id)
    .order('sort_order')
    .limit(8);

  /* ── Fetch reviews ── */
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, comment, created_at, customer_name, appointments(services(name))')
    .eq('barber_id', barber.id)
    .order('created_at', { ascending: false })
    .limit(8);

  const safeServices  = services ?? [];
  const safeStylists  = stylists ?? [];
  const safePortfolio = portfolio ?? [];
  const safeReviews   = reviews ?? [];
  const minPrice = safeServices.length
    ? Math.min(...safeServices.map(s => s.price_cents))
    : 0;

  /* Shape for BookingFlow */
  const barberForFlow = {
    ...barber,
    services:  safeServices,
    stylists:  safeStylists,
    portfolio: safePortfolio.map(p => p.image_url),
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen">

        {/* ── Hero cover ── */}
        <div className="relative h-[300px] w-full overflow-hidden sm:h-[380px]">
          {barber.cover_image_url ? (
            <div
              className="absolute inset-0 scale-105 bg-cover bg-center"
              style={{ backgroundImage: `url(${barber.cover_image_url})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-electric-500/20 to-spark-500/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgb(5,6,8)] via-[rgba(5,6,8,0.55)] to-transparent" />
          <div className="bg-grid absolute inset-0 opacity-30" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">

          {/* ── Profile header ── */}
          <div className="card relative -mt-20 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-5">
                <div className="relative flex-none">
                  <div
                    className={cn(
                      'h-20 w-20 rounded-2xl border-4 border-[rgb(5,6,8)] bg-ink-800 bg-cover bg-center shadow-xl ring-1 ring-white/10 sm:h-24 sm:w-24',
                    )}
                    style={barber.avatar_url ? { backgroundImage: `url(${barber.avatar_url})` } : {}}
                  />
                  {barber.subscription_tier !== 'free' && (
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-electric-500 shadow-glow ring-2 ring-[rgb(5,6,8)]">
                      <BadgeCheck className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{barber.shop_name}</h1>
                    {barber.deposit_required && (
                      <span className="chip-electric !text-[10px]">Acompte requis</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/55">
                    {barber.rating_count > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn('h-3.5 w-3.5', i < Math.round(barber.rating_average) ? 'fill-spark-400 text-spark-400' : 'text-white/15')} />
                          ))}
                        </span>
                        <span className="font-semibold text-white">{Number(barber.rating_average).toFixed(1)}</span>
                        <span className="text-white/35">({barber.rating_count} avis)</span>
                      </span>
                    )}
                    {barber.address && barber.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />{barber.address}, {barber.city}
                      </span>
                    )}
                    {barber.instagram_handle && (
                      <a
                        href={`https://instagram.com/${barber.instagram_handle}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 transition hover:text-white"
                      >
                        <Instagram className="h-3.5 w-3.5" />@{barber.instagram_handle}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              {minPrice > 0 && (
                <div className="hidden text-right sm:block">
                  <div className="text-xs text-white/40">À partir de</div>
                  <div className="text-2xl font-bold tracking-tight">{formatPrice(minPrice)}</div>
                </div>
              )}
            </div>
            {barber.bio && (
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/60">{barber.bio}</p>
            )}
          </div>

          {/* ── Split layout ── */}
          <div className="mt-6 grid grid-cols-1 gap-6 pb-32 sm:pb-16 lg:grid-cols-[1fr_380px]">

            {/* Left: content */}
            <div className="space-y-8 min-w-0">

              {/* Services */}
              {safeServices.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold tracking-tight">Services</h2>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                    {safeServices.map((s, i) => (
                      <Link
                        key={s.id}
                        href={`?service=${s.id}`}
                        scroll={false}
                        className={cn(
                          'group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.04]',
                          i > 0 && 'border-t border-white/[0.05]',
                          searchParams.service === s.id && 'bg-electric-500/[0.07]',
                        )}
                      >
                        <div className="min-w-0">
                          <div className="font-medium group-hover:text-white transition-colors">{s.name}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                            <Clock className="h-3 w-3" />
                            {formatDuration(s.duration_minutes)}
                            {s.description && (
                              <span className="hidden sm:inline truncate max-w-[200px] text-white/30">
                                · {s.description}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-none items-center gap-4">
                          <div className="text-right">
                            <div className="text-base font-bold">{formatPrice(s.price_cents)}</div>
                            {barber.deposit_required && barber.deposit_amount_cents > 0 && (
                              <div className="text-[10px] text-spark-400">
                                {formatPrice(barber.deposit_amount_cents)} d'acompte
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Portfolio */}
              {safePortfolio.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold tracking-tight">Portfolio</h2>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {safePortfolio.map((p, i) => (
                      <div key={i} className="group relative aspect-square overflow-hidden rounded-2xl bg-ink-800">
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url(${p.image_url})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition group-hover:opacity-100" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Notre équipe */}
              {safeStylists.length > 0 && (
                <section>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-white/30" />
                    <h2 className="text-lg font-bold tracking-tight">Notre équipe</h2>
                  </div>
                  <div className={cn(
                    'mt-4 grid gap-3',
                    safeStylists.length === 1 ? 'grid-cols-1' :
                    safeStylists.length === 2 ? 'grid-cols-2' :
                    'grid-cols-2 sm:grid-cols-3',
                  )}>
                    {safeStylists.map(stylist => (
                      <div key={stylist.id} className="card p-5">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          {stylist.avatar_url ? (
                            <div
                              className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center ring-2 ring-white/10"
                              style={{ backgroundImage: `url(${stylist.avatar_url})` }}
                            />
                          ) : (
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-electric-500/15 text-sm font-bold text-electric-300 ring-2 ring-white/10">
                              {initials(stylist.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{stylist.name}</div>
                            {stylist.bio && (
                              <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/45">
                                {stylist.bio}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Specialties */}
                        {stylist.specialties && stylist.specialties.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {(stylist.specialties as string[]).slice(0, 3).map((spec, j) => (
                              <span key={j} className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[10px] text-white/50">
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Reviews */}
              {safeReviews.length > 0 && (
                <section>
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">Avis clients</h2>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-bold text-white">{Number(barber.rating_average).toFixed(1)}</span>
                      <Star className="h-4 w-4 fill-spark-400 text-spark-400" />
                      <span className="text-white/40">· {barber.rating_count} avis</span>
                    </div>
                  </div>

                  {/* Rating overview — distribution bars */}
                  <div className="mt-4 card px-5 py-4 flex items-center gap-6">
                    <div className="text-center shrink-0">
                      <div className="text-4xl font-black">{Number(barber.rating_average).toFixed(1)}</div>
                      <div className="mt-1 flex justify-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn('h-3 w-3', i < Math.round(barber.rating_average) ? 'fill-spark-400 text-spark-400' : 'text-white/15')} />
                        ))}
                      </div>
                      <div className="mt-1 text-[10px] text-white/35">{barber.rating_count} avis</div>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map(n => {
                        const count = safeReviews.filter(r => r.rating === n).length;
                        const pct   = safeReviews.length > 0 ? (count / safeReviews.length) * 100 : 0;
                        return (
                          <div key={n} className="flex items-center gap-2">
                            <span className="w-3 text-right text-[10px] text-white/35">{n}</span>
                            <Star className="h-2.5 w-2.5 shrink-0 fill-spark-400/50 text-spark-400/50" />
                            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full bg-spark-400/60"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-4 text-right text-[10px] text-white/30">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review cards */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {safeReviews.map((r, i) => {
                      const appt        = (r.appointments as any) ?? {};
                      const serviceName = appt.services?.name ?? null;
                      const date = new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                      return (
                        <div key={i} className="card p-5">
                          <div className="flex items-start gap-3">
                            {/* Initials avatar */}
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-electric-500/10 text-xs font-bold text-electric-300">
                              {initials(r.customer_name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-sm font-semibold">{r.customer_name}</div>
                                <div className="flex shrink-0">
                                  {Array.from({ length: 5 }).map((_, j) => (
                                    <Star key={j} className={cn('h-3 w-3', j < r.rating ? 'fill-spark-400 text-spark-400' : 'text-white/15')} />
                                  ))}
                                </div>
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/35">
                                <span className={cn('font-medium', RATING_COLORS[r.rating])}>{RATING_LABELS[r.rating]}</span>
                                {serviceName && <><span className="text-white/15">·</span><span>{serviceName}</span></>}
                                <span className="text-white/15">·</span>
                                <span>{date}</span>
                              </div>
                            </div>
                          </div>
                          {r.comment && (
                            <p className="mt-3 border-t border-white/[0.05] pt-3 text-sm leading-relaxed text-white/60">
                              "{r.comment}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {safeServices.length === 0 && (
                <div className="card p-10 text-center text-white/40 text-sm">
                  Ce barber n'a pas encore configuré ses services.
                </div>
              )}

              {/* Trust */}
              <div className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-xs text-white/40">
                <Shield className="mt-0.5 h-4 w-4 flex-none text-electric-300/60" />
                <span>
                  Réservation sécurisée. Annulation gratuite jusqu'à 24h avant.
                  {barber.deposit_required && barber.deposit_amount_cents > 0 && ` Acompte de ${formatPrice(barber.deposit_amount_cents)} à la réservation.`}
                </span>
              </div>
            </div>

            {/* Right: sticky BookingFlow */}
            {safeServices.length > 0 && (
              <div className="hidden lg:block">
                <div className="sticky top-24">
                  <BookingFlow barber={barberForFlow} initialServiceId={searchParams.service} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile booking bar */}
      {safeServices.length > 0 && (
        <MobileBookingBar barber={barberForFlow} initialServiceId={searchParams.service} minPrice={minPrice} />
      )}

      <Footer />
    </>
  );
}
