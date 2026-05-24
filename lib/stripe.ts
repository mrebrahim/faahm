import Stripe from 'stripe';
import { PLANS, type PlanId } from '@/lib/constants';

if (!process.env.STRIPE_SECRET_KEY) {
  // Avoid throwing at import-time in environments that import this module
  // for typings only (e.g. Next.js build for pages that don't actually call Stripe).
  // Routes that use `stripe` will fail loudly when invoked without the key.
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_missing', {
  // Pin to a known API version so behavior is reproducible across deploys.
  apiVersion: '2025-09-30.clover' as Stripe.LatestApiVersion,
  typescript: true,
  appInfo: {
    name: 'faahm',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://faahm.com',
  },
});

export function getStripePriceId(plan: PlanId): string {
  const id =
    plan === 'yearly'
      ? process.env.STRIPE_PRICE_ID_YEARLY
      : process.env.STRIPE_PRICE_ID_MONTHLY;
  if (!id) {
    throw new Error(
      `Missing env STRIPE_PRICE_ID_${plan.toUpperCase()} — create a recurring price in Stripe and add it to env.`
    );
  }
  return id;
}

export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_YEARLY) return 'yearly';
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return 'monthly';
  return null;
}

export const PLAN_LABELS: Record<PlanId, string> = {
  monthly: PLANS.monthly.name,
  yearly: PLANS.yearly.name,
};
