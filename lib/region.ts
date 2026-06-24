import { cookies, headers } from 'next/headers';

/**
 * Regions we run distinct pricing for. Default ('us' here is just the
 * USD-priced funnel — open to everyone, not US-specific) ships in
 * dollars; 'sa' ships in Saudi riyals with charm-priced numbers
 * (39 ر.س / 149 ر.س) and is the funnel we point Saudi ads at.
 */
export type Region = 'us' | 'sa';

const REGION_COOKIE = 'faahm_region';

/**
 * Region resolution priority:
 *   1. Explicit `?region=sa|us` (lets ads / referrals force a funnel)
 *   2. Sticky cookie (set once a visitor lands on /sa/* or picks SAR)
 *   3. CDN-provided country header (cf-ipcountry on Cloudflare,
 *      x-vercel-ip-country on Vercel — present once we proxy through
 *      either; safely missing on plain Coolify)
 *   4. Default → 'us'
 *
 * Pass `urlRegion` if you've already pulled it off searchParams in a
 * page; otherwise the helper falls through to cookie + headers, which
 * is the right behaviour for /pricing without an explicit override.
 */
export function resolveRegion(urlRegion?: string | null): Region {
  if (urlRegion === 'sa' || urlRegion === 'us') return urlRegion;

  const ck = cookies().get(REGION_COOKIE)?.value;
  if (ck === 'sa' || ck === 'us') return ck as Region;

  try {
    const h = headers();
    const country = (
      h.get('x-vercel-ip-country') ||
      h.get('cf-ipcountry') ||
      h.get('x-country') ||
      ''
    ).toUpperCase();
    if (country === 'SA') return 'sa';
  } catch {
    // headers() throws outside a request scope (e.g. static generation).
  }

  return 'us';
}

/**
 * Sticky preference: once a visitor lands on /sa/* (or explicitly picks
 * SAR) we stamp a cookie so the next /pricing / /checkout / /api/checkout
 * navigation keeps showing them riyals. Cleared on signout in the same
 * way the guest-checkout cookie is.
 */
export function setRegionCookie(region: Region) {
  cookies().set(REGION_COOKIE, region, {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90, // 90d
  });
}

/**
 * Per-region plan numbers. The USD column is the source of truth and
 * the SAR column is the *PRD-approved* charm-priced row (39 / 149 /
 * 449 / 300 — not a runtime FX conversion). Don't tweak SAR without
 * the PRD; the 449 anchor specifically has to stay ≤ 39 × 12 = 468 to
 * remain honest.
 *
 *   anchor      = the "what you'd pay billing monthly for a year" line.
 *                 Real number, used as the strikethrough.
 *   perMonth    = the headline price the yearly card frames itself as.
 *   yearTotal   = what actually hits the card on the yearly plan.
 *   savings     = anchor − yearTotal (rounded to a clean integer).
 *   savingsPct  = same, as a percent.
 */
export type PlanPricing = {
  currency: 'USD' | 'SAR';
  currencyLabel: string;
  symbol: string;
  monthlyPrice: number;
  monthlyDisplay: string;
  yearlyPrice: number;
  yearlyDisplay: string;
  yearlyAnchor: number;
  yearlyAnchorDisplay: string;
  yearlyPerMonthDisplay: string;
  savings: number;
  savingsDisplay: string;
  savingsPct: number;
};

const PRICING: Record<Region, PlanPricing> = {
  us: {
    currency: 'USD',
    currencyLabel: 'USD',
    symbol: '$',
    monthlyPrice: 9.99,
    monthlyDisplay: '$9.99',
    yearlyPrice: 40,
    yearlyDisplay: '$40',
    yearlyAnchor: 119,
    yearlyAnchorDisplay: '$119',
    yearlyPerMonthDisplay: '$3.3',
    savings: 80,
    savingsDisplay: '$80',
    savingsPct: 67,
  },
  sa: {
    currency: 'SAR',
    currencyLabel: 'ر.س',
    symbol: 'ر.س',
    monthlyPrice: 39,
    monthlyDisplay: '39 ر.س',
    yearlyPrice: 149,
    yearlyDisplay: '149 ر.س',
    yearlyAnchor: 449,
    yearlyAnchorDisplay: '449 ر.س',
    // ~12 ر.س/شهر — the leading ~ stays in display to be honest about
    // the rounding (149 ÷ 12 = 12.42).
    yearlyPerMonthDisplay: '~12 ر.س',
    savings: 300,
    savingsDisplay: '300 ر.س',
    savingsPct: 67,
  },
};

export function pricingFor(region: Region): PlanPricing {
  return PRICING[region];
}
