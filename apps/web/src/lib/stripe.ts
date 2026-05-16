import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20',
  typescript: true,
});

export const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO!,
} as const;

export type PaidTier = keyof typeof PRICE_IDS;
