import Stripe from 'stripe';
import type { PlanId } from '@/lib/constants';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_missing', {
  // Pin to a known API version so behavior is reproducible across deploys.
  apiVersion: '2025-09-30.clover' as Stripe.LatestApiVersion,
  typescript: true,
  appInfo: {
    name: 'faahm',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://faahm.com',
  },
});

/**
 * Which plan a Stripe price belonged to.
 *
 * Subscriptions are no longer sold, but the ~60 people who bought one
 * before the change still renew, cancel and generate webhooks — so the
 * billing layer still has to name their plan correctly. The env vars
 * stay set for exactly that reason; a lookup miss falls back to the
 * plan recorded in subscription metadata.
 */
export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const yearly = [
    process.env.STRIPE_PRICE_ID_YEARLY,
    process.env.STRIPE_PRICE_ID_YEARLY_SAR,
  ].filter(Boolean);
  const monthly = [
    process.env.STRIPE_PRICE_ID_MONTHLY,
    process.env.STRIPE_PRICE_ID_MONTHLY_SAR,
  ].filter(Boolean);
  if (yearly.includes(priceId)) return 'yearly';
  if (monthly.includes(priceId)) return 'monthly';
  return null;
}
