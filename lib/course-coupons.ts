import { createServiceClient } from '@/lib/supabase/server';
import { validateCouponCode, type Coupon } from '@/lib/coupons';
import type { PurchasableProduct } from '@/lib/catalog';

/**
 * Coupon links — a discount that lives on a URL, not in the price list.
 *
 *     faahm.com/course/vibe-coding?code=VIBE20
 *
 * Why this rather than editing the catalogue: changing `priceUsd` drops
 * the price for every visitor, has to be undone by hand afterwards, and
 * leaves no record of who got the offer. A coupon is scoped to one
 * product, can expire, can be capped, counts its own redemptions, and
 * ends by flipping `is_active` to false.
 *
 * ## The rule that matters
 *
 * The URL is a HINT. It never sets a price. Every surface — the course
 * page and the checkout route alike — resolves the code against the
 * database again, so a hand-edited `?code=` buys nothing, and neither
 * does an expired code pasted from an old WhatsApp message. The amount
 * Stripe charges is computed here, server-side, from the coupon row.
 */

/** What a code is worth against a specific product. */
export type CouponPricing = {
  coupon: Coupon;
  code: string;
  /** Catalogue price, for the strikethrough. */
  originalUsd: number;
  /** What this buyer actually pays. */
  priceUsd: number;
  priceEgp: number;
  /** Rounded, for the badge. */
  percentOff: number;
};

/**
 * Smallest charge worth opening a Stripe session for. Below roughly
 * $0.50 Stripe refuses the payment outright, and a coupon that makes a
 * course free should be a `free_course` grant through /redeem, not a
 * card charge for pennies.
 */
const MIN_CHARGE_USD = 1;

/**
 * Does this coupon apply to this product?
 *
 * A coupon is tied to a course by `course_id`. The product knows its
 * course SLUGS, so the id is resolved here rather than stored twice.
 * A coupon with no `course_id` is site-wide and applies to anything.
 */
async function appliesToProduct(
  coupon: Coupon,
  product: PurchasableProduct
): Promise<boolean> {
  if (!coupon.course_id) return true;
  if (product.slugs.length === 0) return false;

  const { data } = await createServiceClient()
    .from('courses')
    .select('id')
    .in('slug', product.slugs);

  return (data ?? []).some((c) => c.id === coupon.course_id);
}

/**
 * Clean a `?code=` value before it is looked up.
 *
 * Shared links have been seen arriving as
 * `?code=VIBE20?code=VIBE20` — a link that already carried the code had
 * `?code=` appended again by whatever posted it. The whole tail then
 * lands in one param ("VIBE20?code=VIBE20"), fails the code format
 * check, and the buyer quietly pays full price. Keep only the first
 * token, and take the first value when the param is repeated.
 */
export function normalizeCouponCode(
  raw: string | string[] | null | undefined
): string {
  const first = Array.isArray(raw) ? raw[0] : raw;
  return (first ?? '').trim().split(/[?&#\s]/)[0].toUpperCase();
}

/**
 * Resolve a code against a product and work out the price.
 *
 * Returns null whenever the code doesn't apply — unknown, expired,
 * exhausted, already used by this person, for a different course, or a
 * grant type that belongs in /redeem instead. Null means "full price",
 * never an error page: a bad code must not block a sale.
 */
export async function resolveCouponPricing(
  product: PurchasableProduct,
  rawCode: string | string[] | null | undefined,
  userId?: string | null
): Promise<CouponPricing | null> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return null;

  const result = await validateCouponCode(code, userId);
  if (!result.ok) return null;

  const coupon = result.coupon;

  // 'free_course' / 'free_subscription' hand out access without a
  // payment; they are redeemed on /redeem and have no price to compute.
  if (coupon.discount_type !== 'percent' && coupon.discount_type !== 'fixed') {
    return null;
  }

  if (!(await appliesToProduct(coupon, product))) return null;

  const originalUsd = product.priceUsd;

  // `fixed` is an amount OFF in cents — the unit the admin form already
  // collects ("مبلغ خصم ثابت (cents)"). `percent` is whole percent.
  const offUsd =
    coupon.discount_type === 'percent'
      ? (originalUsd * coupon.discount_value) / 100
      : coupon.discount_value / 100;

  const priceUsd = Math.round(Math.max(MIN_CHARGE_USD, originalUsd - offUsd));

  // A coupon that saves nothing is not worth showing as a discount.
  if (priceUsd >= originalUsd) return null;

  return {
    coupon,
    code,
    originalUsd,
    priceUsd,
    // Same 50 ج.م/$ table the rest of the catalogue uses, so the
    // InstaPay figure an admin reconciles against stays consistent.
    priceEgp: priceUsd * 50,
    percentOff: Math.round(((originalUsd - priceUsd) / originalUsd) * 100),
  };
}

/**
 * Record that a coupon was used, after the payment succeeded.
 *
 * Called from fulfilment rather than checkout: a session the buyer
 * abandons must not burn a seat on a capped code. Best-effort — the
 * access grant has already happened and must never be undone because
 * the counter failed.
 */
export async function recordCouponRedemption(args: {
  couponId: string;
  userId: string;
  email?: string | null;
}): Promise<void> {
  const service = createServiceClient();

  // Idempotent on (coupon, user): a webhook replay must not count twice.
  const { data: existing } = await service
    .from('coupon_redemptions')
    .select('id')
    .eq('coupon_id', args.couponId)
    .eq('user_id', args.userId)
    .maybeSingle();

  if (existing) return;

  const { error } = await service.from('coupon_redemptions').insert({
    coupon_id: args.couponId,
    user_id: args.userId,
    email: args.email ?? null,
  });

  if (error) {
    console.error('[coupon] redemption insert failed', error.message);
    return;
  }

  // Bump the counter the cap is checked against.
  const { data: coupon } = await service
    .from('coupons')
    .select('used_count')
    .eq('id', args.couponId)
    .maybeSingle();

  if (coupon) {
    await service
      .from('coupons')
      .update({ used_count: (coupon.used_count ?? 0) + 1 })
      .eq('id', args.couponId);
  }
}
