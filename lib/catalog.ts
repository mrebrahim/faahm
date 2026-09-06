/**
 * One-off purchases — the à-la-carte half of the price list.
 *
 * فاهم sells two different shapes of thing and they must not be
 * confused:
 *
 *   SUBSCRIPTION ($10/month, $40/year)  → the general catalogue.
 *   PURCHASE     ($60 a course, $99 the bundle) → n8n, AI Video and
 *                Vibe Coding, which no subscription covers.
 *
 * The three premium courses are deliberately OUTSIDE the subscription.
 * A $40/year plan that also unlocked them would make the $60 and $99
 * products unsellable — nobody pays $60 for something a $40 plan opens.
 * So a subscription buys the catalogue; these three are bought once and
 * kept forever.
 *
 * In the database they carry the legacy `courses.yearly_only` flag.
 * The column name is a leftover from when they were a yearly-plan perk;
 * it now means "sold separately". Renaming the column would need a
 * migration and a coordinated deploy for zero behavioural gain, so the
 * flag stays and every TypeScript surface calls it `soldSeparately`.
 */

/** What a purchase grants, and what it costs. */
export type PurchasableProduct = {
  /** Stable id used in checkout URLs and Stripe metadata. */
  id: string;
  /** Course slugs this purchase unlocks, permanently. */
  slugs: string[];
  titleAr: string;
  priceUsd: number;
  /**
   * Charm-priced EGP figure for the InstaPay / Vodafone Cash rails.
   * Deliberately a fixed table rather than a live FX conversion — it
   * has to match what the admin reconciles a WhatsApp screenshot
   * against, and a rate that moves daily makes that impossible.
   * Anchored to the existing table (yearly $40 = 2,000 ج.م).
   */
  priceEgp: number;
  /** Strikethrough figure. Null when there is nothing honest to anchor to. */
  anchorUsd: number | null;
};

/** Every premium course costs the same — one number, one place. */
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
    slugs: ['n8n'],
    titleAr: 'أتمتة n8n',
    priceUsd: COURSE_PRICE_USD,
    priceEgp: COURSE_PRICE_EGP,
    anchorUsd: null,
  },
  'ai-video': {
    id: 'ai-video',
    slugs: ['ai-video'],
    titleAr: 'AI Video Master',
    priceUsd: COURSE_PRICE_USD,
    priceEgp: COURSE_PRICE_EGP,
    anchorUsd: null,
  },
  'vibe-coding': {
    id: 'vibe-coding',
    slugs: ['vibe-coding'],
    titleAr: 'Vibe Coding',
    priceUsd: COURSE_PRICE_USD,
    priceEgp: COURSE_PRICE_EGP,
    anchorUsd: null,
  },
};

/** Slugs of every course that a subscription does NOT cover. */
export const PAID_COURSE_SLUGS = Object.keys(PAID_COURSES);

/**
 * All three at once. The anchor is real arithmetic — 3 × $60 — not an
 * invented list price, so the "you save $81" line survives a sceptical
 * reading.
 */
export const AI_BUNDLE: PurchasableProduct = {
  id: 'ai-bundle',
  slugs: [...PAID_COURSE_SLUGS],
  titleAr: 'AI Bundle — التلات كورسات',
  priceUsd: BUNDLE_PRICE_USD,
  priceEgp: BUNDLE_PRICE_EGP,
  anchorUsd: COURSE_PRICE_USD * 3,
};

export const BUNDLE_ANCHOR_USD = AI_BUNDLE.anchorUsd as number;
export const BUNDLE_SAVINGS_USD = BUNDLE_ANCHOR_USD - BUNDLE_PRICE_USD;
export const BUNDLE_SAVINGS_PCT = Math.round(
  (BUNDLE_SAVINGS_USD / BUNDLE_ANCHOR_USD) * 100
);

/** Everything buyable in one map, so checkout can resolve any id. */
export const PRODUCTS: Record<string, PurchasableProduct> = {
  ...PAID_COURSES,
  [AI_BUNDLE.id]: AI_BUNDLE,
};

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
