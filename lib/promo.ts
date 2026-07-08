/**
 * Yearly-price promo model — two tiers that cycle every month:
 *
 *   Days 6 → 20 (Africa/Cairo)   →  MID tier   →  $80/year  (quiet promo)
 *   Days 21 → 5 (crosses month)  →  DEEP tier  →  $40/year  (loud promo)
 *
 * The list price ($120) is only ever an anchor — it is never actually
 * charged. Every price surface always shows a $120 strikethrough next to
 * whichever tier is live, so the visitor sees the discount context on
 * every page regardless of the day of the month.
 *
 * `deepActive` gates the loud propaganda (sitewide banner + one-time
 * popup) so they only appear during the $40 window. The mid tier is a
 * quiet card-level discount only.
 *
 * Timezone: Africa/Cairo — the merchant is Egyptian and the primary
 * audience runs on Cairo local time. UTC would flip the tier a few
 * hours off from the merchant's calendar around midnight.
 */

export const PROMO_TIMEZONE = 'Africa/Cairo';

/** MID window (inclusive, Cairo day-of-month). */
export const MID_START_DAY = 6;
export const MID_END_DAY = 20;
/** DEEP window is everything OUTSIDE the MID window — i.e. day 21 → day 5. */

export const YEARLY_ANCHOR_USD = 120;
export const YEARLY_MID_USD = 80;
export const YEARLY_DEEP_USD = 40;
export const MONTHLY_USD = 10;

export type PromoTier = 'mid' | 'deep';

export type PromoState = {
  /** Which pricing window is live right now. */
  tier: PromoTier;
  /** Convenience — true when tier === 'deep'. Drives banner + popup. */
  deepActive: boolean;
  /** Day-of-month in PROMO_TIMEZONE, 1–31. */
  day: number;
  yearlyAmount: number;
  yearlyAnchor: number;
  yearlyPerMonth: number;
  savings: number;
  savingsPct: number;
};

function cairoDayOfMonth(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PROMO_TIMEZONE,
    day: 'numeric',
  }).formatToParts(now);
  const dayPart = parts.find((p) => p.type === 'day')?.value;
  const day = Number(dayPart);
  return Number.isFinite(day) ? day : now.getUTCDate();
}

export function getPromoState(now: Date = new Date()): PromoState {
  const day = cairoDayOfMonth(now);
  const inMid = day >= MID_START_DAY && day <= MID_END_DAY;
  const tier: PromoTier = inMid ? 'mid' : 'deep';

  const amount = tier === 'mid' ? YEARLY_MID_USD : YEARLY_DEEP_USD;
  const savings = YEARLY_ANCHOR_USD - amount;
  const savingsPct = Math.round((savings / YEARLY_ANCHOR_USD) * 100);
  const yearlyPerMonth = Math.round((amount / 12) * 100) / 100;

  return {
    tier,
    deepActive: tier === 'deep',
    day,
    yearlyAmount: amount,
    yearlyAnchor: YEARLY_ANCHOR_USD,
    yearlyPerMonth,
    savings,
    savingsPct,
  };
}
