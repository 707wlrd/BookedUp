import Link from 'next/link';
import { Search, MapPin, X, SlidersHorizontal } from 'lucide-react';
import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';
import { BarbersList } from '@/components/customer/BarbersList';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';

// ── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { city?: string; q?: string; sort?: string };
}): Promise<Metadata> {
  const city = searchParams.city?.trim();
  const q = searchParams.q?.trim();

  const titleParts = ['Trouve ton barbier'];
  if (city) titleParts.push(`à ${city}`);
  if (q) titleParts.push(`· "${q}"`);
  titleParts.push('— BookedUp');

  const description = city
    ? `Réserve en ligne chez les meilleurs barbers de ${city}. Disponibilités en temps réel, réservation en 30 secondes.`
    : 'Les meilleurs barbers de France, réservables en ligne en 30 secondes. Filtrez par ville, note ou prix.';

  return {
    title: titleParts.join(' '),
    description,
    openGraph: {
      title: titleParts.join(' '),
      description,
    },
  };
}

export const revalidate = 60;

// ── Page ────────────────────────────────────────────────────────────────────

export default async function BarbersPage({
  searchParams,
}: {
  searchParams: { city?: string; q?: string; sort?: 'rating' | 'price' };
}) {
  const supabase = createClient();

  const city = searchParams.city?.trim() ?? '';
  const q = searchParams.q?.trim() ?? '';

  // Build query
  let query = supabase
    .from('barbers')
    .select(`
      id, slug, shop_name, bio, city, address, country,
      latitude, longitude, cover_image_url, avatar_url,
      rating_average, rating_count, deposit_required,
      deposit_amount_cents, subscription_tier,
      services(id, barber_id, name, duration_minutes, price_cents, is_active, sort_order)
    `)
    .eq('services.is_active', true)
    .order('rating_average', { ascending: false });

  // Server-side city filter
  if (city) {
    query = query.ilike('city', `%${city}%`);
  }

  // Server-side text search on shop_name and city
  if (q) {
    query = query.or(`shop_name.ilike.%${q}%,city.ilike.%${q}%`);
  }

  const { data: barbers } = await query;

  const safeBarbers = (barbers ?? []).map((b) => ({
    ...b,
    services: (b.services ?? []) as Array<{
      id: string;
      barber_id: string;
      name: string;
      duration_minutes: number;
      price_cents: number;
      is_active: boolean;
      sort_order: number;
    }>,
    portfolio: [] as string[],
  }));

  // Extract unique cities from fetched barbers for the city chips
  const uniqueCities = Array.from(
    new Set(safeBarbers.map((b) => b.city).filter(Boolean))
  ).sort() as string[];

  const hasFilters = !!city || !!q;
  const totalCount = safeBarbers.length;

  return (
    <>
      <Nav />
      <main className="min-h-screen">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden border-b border-white/[0.06] bg-[rgb(5,6,8)] pb-12 pt-28">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-electric-500/[0.06] blur-[120px]" />
            <div className="absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-spark-500/[0.04] blur-[100px]" />
            <div className="bg-grid absolute inset-0 opacity-20" />
          </div>

          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="label mb-4 inline-block">Annuaire</div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Trouve ton{' '}
              <span className="gradient-text">barbier.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/50">
              Les meilleurs barbers de France, réservables en ligne en 30 secondes.
            </p>

            {/* ── Search form ── */}
            <form
              method="GET"
              action="/barbers"
              className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
            >
              {/* Text search */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  name="q"
                  defaultValue={q}
                  className="input w-full pl-10"
                  placeholder="Barber, salon…"
                  autoComplete="off"
                />
              </div>

              {/* City filter */}
              <div className="relative sm:w-48">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  name="city"
                  defaultValue={city}
                  className="input w-full pl-10"
                  placeholder="Ville"
                  list="cities-list"
                  autoComplete="off"
                />
                {uniqueCities.length > 0 && (
                  <datalist id="cities-list">
                    {uniqueCities.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                )}
              </div>

              {/* Submit */}
              <button type="submit" className="btn-electric shrink-0 sm:w-auto">
                Rechercher
              </button>
            </form>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

          {/* ── Active filters chips ── */}
          {hasFilters && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-white/40">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtres actifs :
              </span>

              {q && (
                <Link
                  href={buildFilterUrl({ city, q: '', sort: searchParams.sort })}
                  className="chip-electric flex items-center gap-1.5 transition hover:opacity-80"
                >
                  Recherche : «&nbsp;{q}&nbsp;»
                  <X className="h-3 w-3" />
                </Link>
              )}

              {city && (
                <Link
                  href={buildFilterUrl({ city: '', q, sort: searchParams.sort })}
                  className="chip-electric flex items-center gap-1.5 transition hover:opacity-80"
                >
                  <MapPin className="h-3 w-3" />
                  {city}
                  <X className="h-3 w-3" />
                </Link>
              )}

              <Link
                href="/barbers"
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/40 transition hover:border-white/30 hover:text-white/70"
              >
                Tout effacer
              </Link>
            </div>
          )}

          {/* ── Results count ── */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-white/40">
              <span className="font-semibold text-white/70">{totalCount}</span>{' '}
              barber{totalCount !== 1 ? 's' : ''}
              {city && (
                <span>
                  {' '}à <span className="text-white/70">{city}</span>
                </span>
              )}
              {q && (
                <span>
                  {' '}pour «&nbsp;<span className="text-white/70">{q}</span>&nbsp;»
                </span>
              )}
            </p>
          </div>

          {/* ── Barbers list (client component — handles geo, sort, animated grid) ── */}
          {safeBarbers.length > 0 ? (
            <BarbersList barbers={safeBarbers as any} />
          ) : (
            /* ── Empty state ── */
            <div className="card flex flex-col items-center py-20 text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.04]">
                <Search className="h-7 w-7 text-white/20" />
              </div>
              <h2 className="text-base font-semibold text-white/70">Aucun barber trouvé</h2>
              <p className="mt-2 max-w-sm text-sm text-white/40">
                {q || city
                  ? 'Essaie d\'autres termes ou supprime les filtres pour voir tous les barbers.'
                  : 'Aucun barber disponible pour le moment. Reviens bientôt !'}
              </p>
              {hasFilters && (
                <Link href="/barbers" className="btn-electric mt-6">
                  Voir tous les barbers
                </Link>
              )}
            </div>
          )}

          {/* ── Popular cities ── */}
          {uniqueCities.length > 0 && (
            <section className="mt-16 border-t border-white/[0.06] pt-12">
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-white/30">
                Villes populaires
              </h2>
              <div className="flex flex-wrap gap-2">
                {uniqueCities.map((c) => (
                  <Link
                    key={c}
                    href={buildFilterUrl({ city: c, q, sort: searchParams.sort })}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-all duration-150',
                      city.toLowerCase() === c.toLowerCase()
                        ? 'border-electric-500/40 bg-electric-500/10 text-electric-300'
                        : 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80',
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5 opacity-60" />
                    {c}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildFilterUrl({
  city,
  q,
  sort,
}: {
  city?: string;
  q?: string;
  sort?: string;
}): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (city) params.set('city', city);
  if (sort) params.set('sort', sort);
  const qs = params.toString();
  return qs ? `/barbers?${qs}` : '/barbers';
}
