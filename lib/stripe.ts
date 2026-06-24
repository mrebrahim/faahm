import Stripe from 'stripe';
import { PLANS, type PlanId } from '@/lib/constants';
import type { Region } from '@/lib/region';

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

/**
 * Map (plan, region) → Stripe Price ID via env vars. Each region has a
 * distinct recurring price in Stripe (USD vs SAR currency), so we keep
 * them as separate env vars rather than trying to compute one from the
 * other at runtime.
 *
 * Required env vars:
 *   STRIPE_PRICE_ID_MONTHLY        $9.99/month (USD, default region)
 *   STRIPE_PRICE_ID_YEARLY         $40/year   (USD, default region)
 *   STRIPE_PRICE_ID_MONTHLY_SAR    39 ر.س/month (SAR, Saudi region)
 *   STRIPE_PRICE_ID_YEARLY_SAR     149 ر.س/year (SAR, Saudi region)
 *
 * NO silent fallback. A missing SAR price ID used to fall through to
 * the USD one, which meant a misconfigured deploy would happily charge
 * dollars while the page said riyals. We throw loudly now so the bug
 * surfaces in Stripe Checkout (500) instead of in customer support.
 */
export function getStripePriceId(plan: PlanId, region: Region = 'us'): string {
  const envByRegionAndPlan: Record<Region, Record<PlanId, string | undefined>> = {
    us: {
      monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ID_YEARLY,
    },
    sa: {
      monthly: process.env.STRIPE_PRICE_ID_MONTHLY_SAR,
      yearly: process.env.STRIPE_PRICE_ID_YEARLY_SAR,
    },
  };

  const id = envByRegionAndPlan[region]?.[plan];
  if (!id) {
    const envName =
      region === 'sa'
        ? `STRIPE_PRICE_ID_${plan.toUpperCase()}_SAR`
        : `STRIPE_PRICE_ID_${plan.toUpperCase()}`;
    throw new Error(
      `Missing Stripe price ID for plan=${plan} region=${region}. Set env var ${envName} in Coolify and redeploy.`
    );
  }
  return id;
}

export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const yearlyPrices = [
    process.env.STRIPE_PRICE_ID_YEARLY,
    process.env.STRIPE_PRICE_ID_YEARLY_SAR,
  ].filter(Boolean);
  const monthlyPrices = [
    process.env.STRIPE_PRICE_ID_MONTHLY,
    process.env.STRIPE_PRICE_ID_MONTHLY_SAR,
  ].filter(Boolean);
  if (yearlyPrices.includes(priceId)) return 'yearly';
  if (monthlyPrices.includes(priceId)) return 'monthly';
  return null;
}

export const PLAN_LABELS: Record<PlanId, string> = {
  monthly: PLANS.monthly.name,
  yearly: PLANS.yearly.name,
};
