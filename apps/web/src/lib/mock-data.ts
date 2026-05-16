// Mock data used until Supabase is wired up. Mirrors the real DB shape.
import type { Barber, Service } from '@bookedup/shared';

export const MOCK_BARBERS: (Barber & { services: Service[]; portfolio: string[] })[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    owner_id: '00000000-0000-0000-0000-000000000001',
    slug: 'malik-cuts',
    shop_name: 'Malik Cuts',
    bio: 'Fades nets, designs sur mesure, ambiance studio. 10 ans d’expérience à Paris.',
    address: '12 rue de la République',
    city: 'Paris',
    country: 'FR',
    latitude: 48.8566,
    longitude: 2.3522,
    cover_image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600',
    avatar_url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400',
    instagram_handle: 'malikcuts',
    rating_average: 4.9,
    rating_count: 312,
    deposit_required: true,
    deposit_amount_cents: 1000,
    subscription_tier: 'pro',
    services: [
      { id: 's1', barber_id: '10000000-0000-0000-0000-000000000001', name: 'Coupe classique',    description: null, duration_minutes: 30, price_cents: 2500, is_active: true, sort_order: 1 },
      { id: 's2', barber_id: '10000000-0000-0000-0000-000000000001', name: 'Fade + barbe',       description: null, duration_minutes: 45, price_cents: 3500, is_active: true, sort_order: 2 },
      { id: 's3', barber_id: '10000000-0000-0000-0000-000000000001', name: 'Design personnalisé',description: null, duration_minutes: 60, price_cents: 5000, is_active: true, sort_order: 3 },
    ],
    portfolio: [
      'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600',
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600',
      'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600',
    ],
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    owner_id: '00000000-0000-0000-0000-000000000002',
    slug: 'samir-studio',
    shop_name: 'Samir Studio',
    bio: 'Le spot de référence pour le low fade à Lyon.',
    address: '4 rue Mercière',
    city: 'Lyon',
    country: 'FR',
    latitude: 45.7640,
    longitude: 4.8357,
    cover_image_url: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=1600',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    instagram_handle: 'samirstudio',
    rating_average: 4.8,
    rating_count: 187,
    deposit_required: false,
    deposit_amount_cents: 0,
    subscription_tier: 'free',
    services: [
      { id: 's4', barber_id: '10000000-0000-0000-0000-000000000002', name: 'Coupe homme',     description: null, duration_minutes: 30, price_cents: 2200, is_active: true, sort_order: 1 },
      { id: 's5', barber_id: '10000000-0000-0000-0000-000000000002', name: 'Taille de barbe', description: null, duration_minutes: 20, price_cents: 1500, is_active: true, sort_order: 2 },
    ],
    portfolio: [
      'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600',
    ],
  },
];

export function findBarber(slug: string) {
  return MOCK_BARBERS.find((b) => b.slug === slug);
}
