import {
  COURSE_PRICE_USD,
  COURSE_PRICE_EGP,
  BUNDLE_PRICE_USD,
  BUNDLE_PRICE_EGP,
  BUNDLE_ANCHOR_USD,
  BUNDLE_SAVINGS_USD,
  PAID_COURSES,
  PAID_COURSE_SLUGS,
} from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/**
 * Prices for the app's purchase screen.
 *
 * Served rather than hardcoded in the app so a price change reaches
 * every installed build immediately — an app release takes days to
 * propagate, and a stale price on a store build is a support problem we
 * can't fix remotely.
 *
 * No auth: someone who hasn't signed up yet is exactly who this is for.
 *
 * ⚠️ The iOS build runs in reader mode (App Store 3.1.3(a)) and must NOT
 * render any of this as a purchase call-to-action. Serving the numbers
 * is fine; pointing at where to buy is what gets a build rejected.
 */
export async function GET() {
  return Response.json({
    currency: 'USD',
    // No subscription is sold any more. The field stays as an explicit
    // `null` so an older app build reading it fails loudly at the shape
    // rather than rendering a plan that cannot be bought.
    monthly: null,
    yearly: null,
    courses: PAID_COURSE_SLUGS.map((slug) => ({
      id: PAID_COURSES[slug].id,
      title: PAID_COURSES[slug].titleAr,
      price_usd: PAID_COURSES[slug].priceUsd,
      price_egp: PAID_COURSES[slug].priceEgp,
    })),
    bundle: {
      title: 'AI Bundle — التلات كورسات',
      price_usd: BUNDLE_PRICE_USD,
      price_egp: BUNDLE_PRICE_EGP,
      anchor_usd: BUNDLE_ANCHOR_USD,
      savings_usd: BUNDLE_SAVINGS_USD,
    },
    features: [
      'وصول دائم — من غير اشتراك ولا تجديد',
      'كل التحديثات المستقبلية مجاناً',
      'شهادة إتمام لكل كورس',
      'ضمان استرداد ٧ أيام',
    ],
    // Egypt-local rails, quoted in EGP because that's what a student
    // here actually holds. These MUST match /offline/egp — an admin
    // reconciles a WhatsApp payment screenshot against them.
    local: {
      currency: 'ج.م',
      course: COURSE_PRICE_EGP,
      bundle: BUNDLE_PRICE_EGP,
      methods: ['InstaPay', 'Vodafone Cash'],
    },
    // Kept so the app can still label a legacy subscriber's plan.
    course_price_usd: COURSE_PRICE_USD,
  });
}
