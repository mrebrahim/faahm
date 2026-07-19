/**
 * Yearly-price promo — permanent $40 with a rolling monthly urgency clock.
 *
 * Model:
 *   - Yearly is ALWAYS $40 vs a $120 anchor. Never any other price.
 *   - A countdown ticks down to the next 20th of the current month (Cairo
 *     time). When we're past the 20th, the clock rolls forward to the
 *     20th of NEXT month, so the deadline never expires — it just
 *     resets. That gives every visitor a live 'offer ends in Xd Yh' bar
 *     and the popup gets shown fresh at each rollover.
 *
 * List price ($120) is only ever an anchor — it is never actually
 * charged. Every price surface shows a $120 strikethrough next to the
 * $40 headline so the discount context is on every page.
 *
 * Timezone: Africa/Cairo — the merchant is Egyptian and the primary
 * audience runs on Cairo local time.
 */

export const PROMO_TIMEZONE = 'Africa/Cairo';

/** Day-of-month the cycle rolls over on (Cairo time). */
export const CYCLE_DAY = 20;

/** Fixed yearly pricing (USD). */
export const YEARLY_ANCHOR_USD = 120;
export const YEARLY_PRICE_USD = 40;
export const MONTHLY_USD = 10;

export type PromoTier = 'mid' | 'deep';

export type PromoState = {
  /** Kept for backward compat — always 'deep' now. */
  tier: PromoTier;
  /** Kept for backward compat — always true now. Drives banner + popup. */
  deepActive: boolean;
  /** Day-of-month in PROMO_TIMEZONE, 1–31. */
  day: number;
  yearlyAmount: number;
  yearlyAnchor: number;
  yearlyPerMonth: number;
  savings: number;
  savingsPct: number;
  /**
   * Deadline of the current promo cycle — next 20th of the month at
   * 23:59:59 Cairo time. When the clock ticks past this, the next
   * request naturally hands the client a new deadline (start of the
   * next monthly window).
   */
  promoEndsAt: string;
  promoEndsAtMs: number;
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

/**
 * The next cycle end: 20th of the current month at 23:59:59 Cairo. If
 * we're already past that, roll forward to next month.
 * Returned as a UTC Date the client can subtract from Date.now() safely.
 */
function nextCycleEnd(now: Date): Date {
  // Get Cairo year / month / day.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PROMO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const y = get('year');
  const m = get('month'); // 1-12
  const d = get('day');
  const hh = get('hour');
  const mm = get('minute');
  const ss = get('second');

  // Cairo's UTC offset toggles between +02:00 (winter) and +03:00 (DST/summer).
  // Compute the offset for `now` at Cairo by comparing the same instant expressed
  // in both TZs, then reuse it to build the deadline as a UTC ms value.
  const cairoAsUtcMs = Date.UTC(y, m - 1, d, hh, mm, ss);
  const cairoOffsetMs = cairoAsUtcMs - now.getTime();

  // If we're on or before the 20th (still in the current cycle), target this
  // month; otherwise, roll forward to next month.
  let targetY = y;
  let targetM = m; // 1-12
  if (d > CYCLE_DAY) {
    targetM += 1;
    if (targetM > 12) {
      targetM = 1;
      targetY += 1;
    }
  }

  // End of day (23:59:59) on the 20th, Cairo local.
  const targetCairoMs = Date.UTC(targetY, targetM - 1, CYCLE_DAY, 23, 59, 59);
  // Convert Cairo-local to real UTC by subtracting the offset we observed.
  return new Date(targetCairoMs - cairoOffsetMs);
}

export function getPromoState(now: Date = new Date()): PromoState {
  const day = cairoDayOfMonth(now);
  const savings = YEARLY_ANCHOR_USD - YEARLY_PRICE_USD;
  const savingsPct = Math.round((savings / YEARLY_ANCHOR_USD) * 100);
  const yearlyPerMonth = Math.round((YEARLY_PRICE_USD / 12) * 100) / 100;
  const end = nextCycleEnd(now);

  return {
    tier: 'deep',
    deepActive: true,
    day,
    yearlyAmount: YEARLY_PRICE_USD,
    yearlyAnchor: YEARLY_ANCHOR_USD,
    yearlyPerMonth,
    savings,
    savingsPct,
    promoEndsAt: end.toISOString(),
    promoEndsAtMs: end.getTime(),
  };
}
