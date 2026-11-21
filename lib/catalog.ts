/**
 * The price list.
 *
 * فاهم sells three courses and the bundle that packages them. Every
 * purchase is ONE-OFF: $60 a course, $99 for all three, and the access
 * it grants never expires. There is no subscription — the monthly and
 * yearly plans were retired, and nothing here should ever grow a
 * recurring price again without a deliberate decision to sell one.
 *
 * In the database the three carry the legacy `courses.yearly_only`
 * flag. The column name is a leftover from when they were a yearly-plan
 * perk; it now means "sold separately". Renaming it would need a
 * migration and a coordinated deploy for zero behavioural gain, so the
 * flag stays and every TypeScript surface calls it `soldSeparately`.
 */

/**
 * Two shapes of thing are sold, and the difference is the duration.
 *
 *   'course'     — a course or the bundle. Paid once, kept forever.
 *   'membership' — AI Lab: the cohort, the live sessions, the project
 *                  review, the certificate. Paid once for a fixed
 *                  stretch of time.
 *
 * A membership is NOT a subscription. One payment, a known end date,
 * no recurring billing and nothing to cancel — which is exactly why it
 * can sit beside the one-off courses without dragging the retired
 * subscription machinery back in.
 */
export type ProductKind = 'course' | 'membership';

/** What a purchase grants, and what it costs. */
export type PurchasableProduct = {
  /** Stable id used in checkout URLs and Stripe metadata. */
  id: string;
  kind: ProductKind;
  /** Course slugs this purchase unlocks. Empty for a membership. */
  slugs: string[];
  titleAr: string;
  priceUsd: number;
  /**
   * Recurring interval, for a membership that renews. `null` means a
   * single payment. This is the ONLY thing on the site that recurs —
   * every course is bought once and kept.
   */
  interval: 'month' | 'year' | null;
  /**
   * EGP figure for the InstaPay / Vodafone Cash rails.
   * Deliberately a fixed table rather than a live FX conversion — it
   * has to match what the admin reconciles a WhatsApp screenshot
   * against, and a rate that moves daily makes that impossible.
   *
   * It is a straight conversion at the table's standing 50 ج.م/$, NOT a
   * discount: Egypt pays the same as the Gulf. The only reason the
   * number exists at all is that you cannot send dollars over InstaPay.
   */
  priceEgp: number;
  /** Strikethrough figure. Null when there is nothing honest to anchor to. */
  anchorUsd: number | null;
  /**
   * How long the access lasts, in months. `null` means forever, which
   * is what every course grants. A membership always has a number here.
   */
  accessMonths: number | null;
  /**
   * Hard cap on how many can ever be sold — the founding tier. `null`
   * is unlimited. Enforced server-side at checkout, not just hidden in
   * the UI, because the UI is not where someone determined to buy a
   * 101st founding seat would be stopped.
   */
  seatLimit: number | null;
};

/**
 * The standing course price.
 *
 * Discounts are NOT applied by editing this, or by giving one course a
 * lower `priceUsd`. That changes the price for everyone and has to be
 * undone by hand later. A discount is a COUPON — a code on a link that
 * prices one checkout — see lib/course-coupons.ts.
 */
export const COURSE_PRICE_USD = 60;
export const COURSE_PRICE_EGP = 3_000;

export const BUNDLE_PRICE_USD = 99;
export const BUNDLE_PRICE_EGP = 5_000;

/**
 * The three courses sold on their own. Keyed by `courses.slug`, which
 * is what every checkout URL and marketing page already uses.
 */
export const PAID_COURSES: Record<string, PurchasableProduct> = {
  n8n: {
    id: 'n8n',
    kind: 'course',
    slugs: ['n8n'],
    titleAr: 'أتمتة n8n',
    priceUsd: COURSE_PRICE_USD,
    priceEgp: COURSE_PRICE_EGP,
    anchorUsd: null,
    interval: null,
    accessMonths: null,
    seatLimit: null,
  },
  'ai-video': {
    id: 'ai-video',
    kind: 'course',
    slugs: ['ai-video'],
    titleAr: 'AI Video Master',
    priceUsd: COURSE_PRICE_USD,
    priceEgp: COURSE_PRICE_EGP,
    anchorUsd: null,
    interval: null,
    accessMonths: null,
    seatLimit: null,
  },
  'vibe-coding': {
    id: 'vibe-coding',
    kind: 'course',
    slugs: ['vibe-coding'],
    titleAr: 'Vibe Coding',
    priceUsd: COURSE_PRICE_USD,
    priceEgp: COURSE_PRICE_EGP,
    anchorUsd: null,
    interval: null,
    accessMonths: null,
    seatLimit: null,
  },
};

/** Slugs of every course that a subscription does NOT cover. */
export const PAID_COURSE_SLUGS = Object.keys(PAID_COURSES);

/** What the three courses cost bought one by one, at today's prices. */
function sumOfCoursePrices(): number {
  return Object.values(PAID_COURSES).reduce((t, c) => t + c.priceUsd, 0);
}

/** Cheapest course on sale right now — what "من $X" should quote. */
export const MIN_COURSE_PRICE_USD = Math.min(
  ...Object.values(PAID_COURSES).map((c) => c.priceUsd)
);
export const MIN_COURSE_PRICE_EGP = Math.min(
  ...Object.values(PAID_COURSES).map((c) => c.priceEgp)
);

/** True when a product is currently below its list price. */
export function isDiscounted(product: PurchasableProduct): boolean {
  return product.anchorUsd !== null && product.anchorUsd > product.priceUsd;
}

/** Percent off, rounded. 0 when the product is not on offer. */
export function discountPct(product: PurchasableProduct): number {
  if (!isDiscounted(product)) return 0;
  const anchor = product.anchorUsd as number;
  return Math.round(((anchor - product.priceUsd) / anchor) * 100);
}

/**
 * All three at once. The anchor is real arithmetic — 3 × $60 — not an
 * invented list price, so the "you save $81" line survives a sceptical
 * reading.
 */
export const AI_BUNDLE: PurchasableProduct = {
  id: 'ai-bundle',
  kind: 'course',
  slugs: [...PAID_COURSE_SLUGS],
  titleAr: 'AI Bundle — التلات كورسات',
  priceUsd: BUNDLE_PRICE_USD,
  priceEgp: BUNDLE_PRICE_EGP,
  // Derived, never typed: the sum of what the three actually cost
  // today. Hard-coding 3 × $60 here would have claimed a $180 anchor
  // the moment one of them went on offer, and "you save $X" would
  // have been arithmetic the buyer could disprove in ten seconds.
  anchorUsd: sumOfCoursePrices(),
  interval: null,
  accessMonths: null,
  seatLimit: null,
};

/* ── AI Lab ──────────────────────────────────────────────────────────
 * The programme that wraps the three courses: a 12-week cohort with a
 * weekly live workshop, project review and a certificate.
 *
 * What is being sold here is NOT the videos — a course buyer already
 * has those. It's the schedule, the deadline and someone looking at
 * your work. That distinction has to survive into the copy, or it reads
 * as paying twice for the same thing.
 */
export const AI_LAB_MONTHS = 12;

/**
 * AI Lab RENEWS. It is the one recurring thing on the site.
 *
 * That is a deliberate exception, not a drift back to the old plans:
 * a cohort programme with weekly live sessions is an ongoing service,
 * and charging for it once while delivering it forever doesn't work.
 * Courses stay one-off — buy once, keep forever. Nothing else here
 * should grow an `interval`.
 */
export const AI_LAB_MONTHLY: PurchasableProduct = {
  id: 'ai-lab-monthly',
  kind: 'membership',
  slugs: [],
  titleAr: 'فاهم AI Lab — شهري',
  priceUsd: 40,
  priceEgp: 2_000,
  anchorUsd: null,
  interval: 'month',
  accessMonths: 1,
  seatLimit: null,
};

export const AI_LAB_YEARLY: PurchasableProduct = {
  id: 'ai-lab-yearly',
  kind: 'membership',
  slugs: [],
  titleAr: 'فاهم AI Lab — سنوي',
  priceUsd: 199,
  priceEgp: 10_000,
  // 12 × $40 is what the monthly plan actually costs over a year, so
  // the saving is arithmetic the buyer can check rather than a claim.
  anchorUsd: 40 * 12,
  interval: 'year',
  accessMonths: AI_LAB_MONTHS,
  seatLimit: null,
};

export const AI_LAB_YEARLY_SAVINGS_USD =
  (AI_LAB_YEARLY.anchorUsd as number) - AI_LAB_YEARLY.priceUsd;

/** Back-compat alias — the yearly plan is the headline AI Lab product. */
export const AI_LAB = AI_LAB_YEARLY;

/**
 * Capped launch tier: one payment, one year, no renewal.
 *
 * PARKED — not offered publicly right now. The id stays resolvable so
 * an existing link still works and an admin can still grant the tier by
 * hand, but nothing links to it. Put it back in AI_LAB_PUBLIC_TIERS to
 * run the launch offer.
 */
export const AI_LAB_FOUNDING_SEATS = 100;

export const AI_LAB_FOUNDING: PurchasableProduct = {
  id: 'ai-lab-founding',
  kind: 'membership',
  slugs: [],
  titleAr: 'فاهم AI Lab — عضوية التأسيس',
  priceUsd: 99,
  priceEgp: 5_000,
  anchorUsd: AI_LAB_YEARLY.priceUsd,
  interval: null,
  accessMonths: AI_LAB_MONTHS,
  seatLimit: AI_LAB_FOUNDING_SEATS,
};

/** What the pricing surfaces actually offer, in display order. */
export const AI_LAB_PUBLIC_TIERS: PurchasableProduct[] = [
  AI_LAB_YEARLY,
  AI_LAB_MONTHLY,
];

/** True when buying this product opens a Stripe subscription. */
export function isRecurring(product: PurchasableProduct): boolean {
  return product.interval !== null;
}

export const BUNDLE_ANCHOR_USD = AI_BUNDLE.anchorUsd as number;
export const BUNDLE_SAVINGS_USD = BUNDLE_ANCHOR_USD - BUNDLE_PRICE_USD;
export const BUNDLE_SAVINGS_PCT = Math.round(
  (BUNDLE_SAVINGS_USD / BUNDLE_ANCHOR_USD) * 100
);

/** Everything buyable in one map, so checkout can resolve any id. */
export const PRODUCTS: Record<string, PurchasableProduct> = {
  ...PAID_COURSES,
  [AI_BUNDLE.id]: AI_BUNDLE,
  [AI_LAB_MONTHLY.id]: AI_LAB_MONTHLY,
  [AI_LAB_YEARLY.id]: AI_LAB_YEARLY,
  [AI_LAB_FOUNDING.id]: AI_LAB_FOUNDING,
};

/** True for AI Lab — grants a membership rather than course access. */
export function isMembership(product: PurchasableProduct): boolean {
  return product.kind === 'membership';
}

/** Resolve a checkout `?product=` value. Returns null for anything unknown. */
export function productById(id: string | null | undefined): PurchasableProduct | null {
  if (!id) return null;
  return PRODUCTS[id] ?? null;
}

/** Is this course sold on its own rather than bundled into a plan? */
export function isPaidCourseSlug(slug: string | null | undefined): boolean {
  return !!slug && slug in PAID_COURSES;
}

/**
 * The buy-this-course product for a course slug, or null when the
 * course is covered by a subscription and has no standalone price.
 */
export function productForCourseSlug(
  slug: string | null | undefined
): PurchasableProduct | null {
  if (!slug) return null;
  return PAID_COURSES[slug] ?? null;
}

/** `/api/checkout/course?product=…` — the one-off purchase entry point. */
export function checkoutHrefFor(product: PurchasableProduct): string {
  return `/api/checkout/course?product=${encodeURIComponent(product.id)}`;
}
