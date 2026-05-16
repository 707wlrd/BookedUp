import { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/barbers', '/barbers/'],
        disallow: ['/studio/', '/account/', '/onboarding/', '/api/', '/cancel/', '/review/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
