/**
 * Yearly-price promo window. Between day PROMO_START and PROMO_END of every
 * month (inclusive, calendar day-of-month) the yearly plan drops from the
 * regular list price to the promo price. Outside that window the yearly
 * plan shows the regular price and no discount UI.
 *
 * Timezone: Africa/Cairo — the merchant is Egyptian and the primary market
 * runs on Cairo local time. Using UTC would mean the promo flips a few
 * hours off from the merchant's calendar, which is a real hazard around
 * midnight.
 *
 * Every price surface in the app runs pricingFor('us') which now delegates
 * to the promo state below, so home / pricing / personal-plan / checkout /
 * dashboard / faq / course / lesson all switch together — no per-page
 * date logic anywhere else in the codebase.
 */

export const PROMO_TIMEZONE = 'Africa/Cairo';
export const PROMO_START_DAY = 6;
export const PROMO_END_DAY = 20;

/** Promo pricing (USD). Regular is the non-promo baseline. */
export const YEARLY_PROMO_USD = 40;
export const YEARLY_REGULAR_USD = 120;
export const MONTHLY_USD = 10;

export type PromoState = {
  active: boolean;
  /** Day-of-month in PROMO_TIMEZONE, 1–31. */
  day: number;
  yearlyAmount: number;
  /** Strike-through anchor shown on cards — null when no promo is active. */
  yearlyAnchor: number | null;
  /** yearlyAmount / 12, one decimal. Kept for cards that still need a per-month figure. */
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
  const active = day >= PROMO_START_DAY && day <= PROMO_END_DAY;

  const amount = active ? YEARLY_PROMO_USD : YEARLY_REGULAR_USD;
  const anchor = active ? YEARLY_REGULAR_USD : null;
  const savings = active ? YEARLY_REGULAR_USD - YEARLY_PROMO_USD : 0;
  const savingsPct =
    active && YEARLY_REGULAR_USD > 0
      ? Math.round(((YEARLY_REGULAR_USD - YEARLY_PROMO_USD) / YEARLY_REGULAR_USD) * 100)
      : 0;
  const yearlyPerMonth = Math.round((amount / 12) * 100) / 100;

  return {
    active,
    day,
    yearlyAmount: amount,
    yearlyAnchor: anchor,
    yearlyPerMonth,
    savings,
    savingsPct,
  };
}
