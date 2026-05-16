import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: new Date(), changeFrequency: 'weekly',  priority: 1 },
    { url: `${BASE}/barbers`, lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/auth`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Dynamic barber pages
  try {
    const supabase = createClient();
    const { data: barbers } = await supabase
      .from('barbers')
      .select('slug, updated_at')
      .not('slug', 'is', null);

    const barberRoutes: MetadataRoute.Sitemap = (barbers ?? []).map((b) => ({
      url:              `${BASE}/barbers/${b.slug}`,
      lastModified:     b.updated_at ? new Date(b.updated_at) : new Date(),
      changeFrequency:  'weekly' as const,
      priority:         0.8,
    }));

    return [...staticRoutes, ...barberRoutes];
  } catch {
    return staticRoutes;
  }
}
