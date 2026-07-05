/**
 * Constants + pure helpers for the video-dubbing service. Nothing
 * in here talks to the DB or Stripe — those live in the API routes.
 * Kept isolated so both the client form (live total, disable
 * checks) and the server (validated total, SLA copy) call the same
 * functions.
 */

/** Per-minute price. Change here → everything downstream (form
 *  total, Stripe quantity math, refund calculations) picks it up. */
export const DUBBING_USD_PER_MINUTE = 2;

/** Hard bounds for the minutes input. Anything outside is rejected
 *  server-side to stop price-tampering. */
export const DUBBING_MIN_MINUTES = 1;
export const DUBBING_MAX_MINUTES = 1000;

/** WhatsApp contact — same number used for post-purchase support
 *  on /billing/success. Kept as a raw string so wa.me links can
 *  concatenate directly. */
export const DUBBING_SUPPORT_WHATSAPP = '201050858834';

/** Ready-made Arabic prefill for the WhatsApp CTA on the thank-you
 *  page. Constant so the merchant can grep-replace it once if the
 *  copy changes. */
export const DUBBING_SUPPORT_WA_MESSAGE =
  'لقد دفعت خدمة دبلجه فيديوهات واريد الاستفسار عن';

/** Return the total price for N minutes at the standing rate.
 *  Result is an integer USD figure (2 × N) — no fractional cents. */
export function dubbingTotalUsd(minutes: number): number {
  return Math.max(0, Math.floor(minutes) * DUBBING_USD_PER_MINUTE);
}

/** Server-side validator for the minutes field. Anything not a
 *  finite integer inside [MIN, MAX] returns null. Never throw — the
 *  caller decides how to respond to bad input. */
export function validateMinutes(raw: unknown): number | null {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? parseInt(raw, 10)
        : NaN;
  if (!Number.isFinite(n)) return null;
  const int = Math.floor(n);
  if (int < DUBBING_MIN_MINUTES || int > DUBBING_MAX_MINUTES) return null;
  return int;
}

/** Delivery SLA: every 60 minutes of source video adds one working
 *  day. 1-60 → 1 day, 61-120 → 2 days, etc. */
export function deliveryDays(minutes: number): number {
  const clamped = Math.max(1, Math.min(DUBBING_MAX_MINUTES, Math.floor(minutes)));
  return Math.ceil(clamped / 60);
}

/**
 * Arabic day-count string with the correct dual/plural form. Used
 * verbatim in the thank-you page.
 *
 *   1  → 'خلال 24 ساعة'
 *   2  → 'خلال يومين (48 ساعة)'
 *   3-10 → 'خلال N أيام'
 *   11+  → 'خلال N يوم'
 */
export function deliveryHumanArabic(days: number): string {
  if (days <= 0) return 'خلال 24 ساعة';
  if (days === 1) return 'خلال 24 ساعة';
  if (days === 2) return 'خلال يومين (48 ساعة)';
  if (days >= 3 && days <= 10) return `خلال ${days} أيام`;
  return `خلال ${days} يوم`;
}

/** Bundle both — the thank-you page just calls this. */
export function deliveryFor(minutes: number): {
  days: number;
  hours: number;
  human: string;
} {
  const days = deliveryDays(minutes);
  return {
    days,
    hours: days * 24,
    human: deliveryHumanArabic(days),
  };
}

/**
 * Cheap email + URL-ish validators for the API's request-shape
 * check. NOT meant to gate deliverability — Stripe will still
 * collect a customer email and the merchant will still eyeball the
 * links before running the job. Just enough to reject obvious junk
 * before we open a Stripe session.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmailish(s: string): boolean {
  return typeof s === 'string' && EMAIL_RE.test(s.trim());
}

export function normaliseLinks(raw: string): string[] {
  return String(raw ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100); // hard cap — nobody legitimately drops 100+ links
}
