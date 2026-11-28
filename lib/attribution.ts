import type { NextRequest, NextResponse } from 'next/server';

/**
 * Marketing attribution — which channel sent the buyer.
 *
 * The finance ledger had no channel per transaction, so ROMI per
 * campaign was guesswork. This captures the last non-direct touch
 * (utm_* params, ad click ids, or an external referrer) in a cookie at
 * the edge, and every checkout stamps it onto Stripe metadata (session
 * + payment intent / subscription) so a charge carries its channel all
 * the way to the ledger.
 *
 * Last-touch on purpose: a visitor who first came from YouTube and then
 * clicked a WhatsApp link to pay should be credited to WhatsApp — that
 * is the link that closed. The first-touch source is kept alongside so
 * the analyst can still see where they were discovered.
 */

export const ATTRIBUTION_COOKIE = 'faahm_attr';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const CLICK_IDS: Record<string, { source: string; medium: string }> = {
  fbclid: { source: 'facebook', medium: 'paid_social' },
  gclid: { source: 'google', medium: 'cpc' },
  ttclid: { source: 'tiktok', medium: 'paid_social' },
};

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  first_source?: string;
  landing?: string;
  ts?: string;
};

/** Stripe metadata values cap at 500 chars; keep ours short and clean. */
function clean(v: string | null | undefined, max = 100): string | undefined {
  if (!v) return undefined;
  const s = v.trim().slice(0, max);
  return s || undefined;
}

function fromParams(params: URLSearchParams): Attribution | null {
  const out: Attribution = {};
  for (const k of UTM_KEYS) {
    const v = clean(params.get(k));
    if (v) out[k] = v.toLowerCase();
  }
  if (!out.utm_source) {
    for (const [id, guess] of Object.entries(CLICK_IDS)) {
      if (params.get(id)) {
        out.utm_source = guess.source;
        out.utm_medium = out.utm_medium ?? guess.medium;
        break;
      }
    }
  }
  return out.utm_source ? out : null;
}

function fromReferrer(referer: string | null, ownHost: string): Attribution | null {
  if (!referer) return null;
  try {
    const host = new URL(referer).hostname.replace(/^www\./, '').toLowerCase();
    if (!host || host === ownHost.replace(/^www\./, '').toLowerCase()) return null;
    // Stripe / PayPal bouncing the buyer back is not a marketing touch.
    if (/(^|\.)(stripe\.com|paypal\.com|checkout\.stripe\.com)$/.test(host)) return null;
    return { utm_source: host, utm_medium: 'referral' };
  } catch {
    return null;
  }
}

export function readAttribution(raw: string | undefined | null): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Attribution;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Edge hook — call from middleware on every page request. Only writes
 * the cookie when this request carries a real marketing touch, so
 * internal navigation never overwrites the source.
 */
export function captureAttribution(request: NextRequest, response: NextResponse): NextResponse {
  const { searchParams, pathname, hostname } = request.nextUrl;
  if (pathname.startsWith('/api/') || pathname.startsWith('/admin')) return response;

  const existing = readAttribution(request.cookies.get(ATTRIBUTION_COOKIE)?.value);
  const touch =
    fromParams(searchParams) ??
    // A referrer only counts when we have nothing better on file —
    // otherwise a Google search after a WhatsApp click would steal it.
    (existing ? null : fromReferrer(request.headers.get('referer'), hostname));

  if (!touch) return response;

  const value: Attribution = {
    ...touch,
    first_source: existing?.first_source ?? existing?.utm_source ?? touch.utm_source,
    landing: clean(pathname, 80),
    ts: new Date().toISOString().slice(0, 10),
  };
  response.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(value), {
    maxAge: MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

/**
 * Collapse a raw source into the channel names the office reports use,
 * so the ledger groups "fb", "facebook.com" and "m.facebook.com" as one.
 */
export function channelFor(a: Attribution | null): string {
  if (!a?.utm_source) return 'direct';
  const s = a.utm_source.toLowerCase();
  const m = (a.utm_medium ?? '').toLowerCase();
  if (/youtu/.test(s)) return 'youtube';
  if (/instagram|^ig$/.test(s)) return 'instagram';
  if (/facebook|^fb$|fb\.com|messenger/.test(s)) return 'facebook';
  if (/tiktok/.test(s)) return 'tiktok';
  if (/linkedin|lnkd/.test(s)) return 'linkedin';
  if (/whatsapp|^wa$|wa\.me/.test(s)) return 'whatsapp';
  if (/kit|convertkit|newsletter|mail|email/.test(s) || m === 'email') return 'email';
  if (/n8nar/.test(s)) return 'n8nar';
  if (/google|bing|duckduckgo|yahoo/.test(s)) return m === 'cpc' ? 'google_ads' : 'search';
  if (/chatgpt|openai|perplexity|claude|gemini/.test(s)) return 'ai_search';
  if (m === 'affiliate' || m === 'partner') return 'affiliate';
  return m === 'referral' ? 'referral' : s.slice(0, 40);
}

/**
 * Metadata to stamp on a Stripe Checkout Session / PaymentIntent /
 * Subscription. Explicit utm_* on the checkout URL win over the cookie,
 * so a link sent straight to /api/checkout/course?...&utm_source=whatsapp
 * is credited correctly even if the buyer never saw a page first.
 */
export function attributionMetadata(
  params: URLSearchParams | null,
  cookieValue: string | undefined | null
): Record<string, string> {
  const stored = readAttribution(cookieValue);
  const explicit = params ? fromParams(params) : null;
  const a = explicit
    ? { ...explicit, first_source: stored?.first_source ?? stored?.utm_source }
    : stored;
  const out: Record<string, string> = { channel: channelFor(a) };
  if (!a) return out;
  for (const k of [...UTM_KEYS, 'first_source', 'landing'] as const) {
    const v = clean(a[k]);
    if (v) out[k] = v;
  }
  return out;
}
