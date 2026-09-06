import { pricingFor } from '@/lib/region';
import { PLANS } from '@/lib/constants';
import {
  COURSE_PRICE_USD,
  COURSE_PRICE_EGP,
  BUNDLE_PRICE_USD,
  BUNDLE_PRICE_EGP,
  PAID_COURSES,
  PAID_COURSE_SLUGS,
} from '@/lib/catalog';

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
      missing: [...PLANS.yearly.missingFeatures],
      badge: PLANS.yearly.badge,
    },
    // Courses no plan covers. Sent so the app's subscribe screen can be
    // honest about what a subscription does and doesn't open — it is NOT
    // a purchase CTA, and the iOS build (reader mode) must not render it
    // as one.
    separate_courses: {
      price_usd: COURSE_PRICE_USD,
      bundle_price_usd: BUNDLE_PRICE_USD,
      titles: PAID_COURSE_SLUGS.map((s) => PAID_COURSES[s].titleAr),
    },
    // Egypt-local rails, quoted in EGP because that's what a student
    // here actually holds. These MUST match the figures on
    // /offline/egp — the admin reconciles a WhatsApp payment screenshot
    // against them, so a mismatch between app and web is a support
    // ticket every time.
    local: {
      currency: 'ج.م',
      monthly: 500,
      yearly: 2000,
      course: COURSE_PRICE_EGP,
      bundle: BUNDLE_PRICE_EGP,
      methods: ['InstaPay', 'Vodafone Cash'],
    },
  });
}
