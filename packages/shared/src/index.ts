// Shared types and constants between web and mobile.

export type UserRole = 'customer' | 'barber' | 'admin';
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type SubscriptionTier = 'free' | 'pro';

export interface Profile {
  id: string;
  role: UserRole;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  locale: string;
  created_at: string;
}

export interface Barber {
  id: string;
  owner_id: string;
  slug: string;
  shop_name: string;
  bio: string | null;
  address: string | null;
  city: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  rating_average: number;
  rating_count: number;
  deposit_required: boolean;
  deposit_amount_cents: number;
  subscription_tier: SubscriptionTier;
}

export interface Service {
  id: string;
  barber_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
}

export interface Stylist {
  id: string;
  barber_id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  specialties: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  barber_id: string;
  customer_id: string | null;
  service_id: string;
  stylist_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  price_cents: number;
  deposit_cents: number;
  payment_status: PaymentStatus;
}

export interface Review {
  id: string;
  barber_id: string;
  customer_id: string;
  appointment_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

// ─── Pricing ──────────────────────────────────────────────
export const PLANS = {
  free: {
    name: 'Gratuit',
    price_eur: 0,
    appointment_limit: null,
    trial_days: 30,
    features: [
      '1 mois gratuit — toutes les fonctionnalités',
      'Réservations en ligne illimitées',
      'Profil public',
      'Rappels email automatiques',
      'Accès à toutes les fonctionnalités Pro',
    ],
  },
  pro: {
    name: 'Pro',
    price_eur: 29.99,
    appointment_limit: null,
    trial_days: 0,
    features: [
      'RDV illimités',
      'Acomptes Stripe',
      'Rappels SMS/email',
      'Analytics avancées',
      'IA — captions Instagram',
      'IA — stories disponibilités',
      'IA — rappels intelligents',
      'Support prioritaire',
    ],
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────
export const formatPrice = (cents: number, locale = 'fr') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);

export const formatDuration = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 ? minutes % 60 : ''}`;
