import { pricingFor } from '@/lib/region';
import { PLANS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * Plan pricing for the app's subscribe screen.
 *
 * Served rather than hardcoded in the app because the yearly price moves
 * on a promo cycle — a hardcoded number would go stale the moment the
 * cycle rolls, and correcting it would mean an app release that takes
 * days to reach anyone.
 *
 * No auth: a visitor who hasn't signed up yet is exactly who this screen
 * is for.
 */
export async function GET() {
  const p = pricingFor('us');

  return Response.json({
    currency: 'USD',
    monthly: {
      amount: p.monthlyAmount,
      per: 'شهر',
      features: [...PLANS.monthly.features],
      missing: [...PLANS.monthly.missingFeatures],
    },
    yearly: {
      amount: p.yearlyAmount,
      anchor: p.yearlyAnchor,
      savings_pct: p.savingsPct,
      per: 'سنة',
      features: [...PLANS.yearly.features],
      badge: PLANS.yearly.badge,
    },
    // Egypt-local rails, quoted in EGP because that's what a student
    // here actually holds.
    local: {
      currency: 'ج.م',
      monthly: 500,
      yearly: 4000,
      methods: ['InstaPay', 'Vodafone Cash'],
    },
  });
}
