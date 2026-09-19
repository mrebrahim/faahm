/**
 * The rolling monthly urgency clock.
 *
 * This used to carry the yearly-subscription promo ($40 vs a $120
 * anchor). Subscriptions are no longer sold, so all that is gone — what
 * remains is just the deadline itself: a countdown to the next 20th of
 * the month (Cairo time) that rolls forward once it passes, so a landing
 * page always has a live "offer ends in Xd Yh" without anyone having to
 * maintain a date.
 *
 * Product prices live in lib/catalog.ts and owe nothing to this file.
 *
 * Timezone: Africa/Cairo — the merchant is Egyptian and the primary
 * audience runs on Cairo local time.
 */

export const PROMO_TIMEZONE = 'Africa/Cairo';

/** Day-of-month the cycle rolls over on (Cairo time). */
export const CYCLE_DAY = 20;

export type PromoState = {
  /** Day-of-month in PROMO_TIMEZONE, 1–31. */
  day: number;
  /**
   * Deadline of the current cycle — the next 20th at 23:59:59 Cairo.
   * Once the clock ticks past it, the next request hands the client the
   * following month's deadline, so it never goes stale.
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

  // Cairo's UTC offset toggles between +02:00 (winter) and +03:00 (DST).
  // Compute the offset for `now` by comparing the same instant expressed
  // in both zones, then reuse it to build the deadline as a UTC ms value.
  const cairoAsUtcMs = Date.UTC(y, m - 1, d, hh, mm, ss);
  const cairoOffsetMs = cairoAsUtcMs - now.getTime();

  let targetY = y;
  let targetM = m; // 1-12
  if (d > CYCLE_DAY) {
    targetM += 1;
    if (targetM > 12) {
      targetM = 1;
      targetY += 1;
    }
  }

  const targetCairoMs = Date.UTC(targetY, targetM - 1, CYCLE_DAY, 23, 59, 59);
  return new Date(targetCairoMs - cairoOffsetMs);
}

export function getPromoState(now: Date = new Date()): PromoState {
  const end = nextCycleEnd(now);
  return {
    day: cairoDayOfMonth(now),
    promoEndsAt: end.toISOString(),
    promoEndsAtMs: end.getTime(),
  };
}
