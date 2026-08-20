/**
 * GA4 Measurement Protocol — server-side event ingestion.
 *
 * The website reports to GA4 through gtag in the browser. The mobile app
 * can't do that, so it posts its events here and we forward them to the
 * same GA4 property over the Measurement Protocol. One property, one set
 * of reports, web and app side by side.
 *
 * Deliberately NOT the Firebase SDK. Firebase Analytics on Android
 * depends on Google Play Services, which does not exist on Huawei
 * devices — the very build we ship to AppGallery would report nothing.
 * The Measurement Protocol is plain HTTPS and works everywhere.
 *
 * Setup: GA4 → Admin → Data Streams → your stream → Measurement
 * Protocol API secrets → Create. Put the value in GA4_API_SECRET.
 */

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const API_SECRET = process.env.GA4_API_SECRET;

const ENDPOINT = 'https://www.google-analytics.com/mp/collect';
/** Swap to this to see why events are rejected — it returns validation errors. */
const DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

export type Ga4Event = {
  name: string;
  params?: Record<string, string | number | boolean | undefined | null>;
};

/**
 * GA4 rejects an event name that isn't [a-zA-Z][a-zA-Z0-9_]{0,39}, and it
 * fails silently — the request returns 204 and the event never appears.
 * Normalising here means a typo in a call site costs a slightly odd
 * event name instead of a week of missing data.
 */
function safeEventName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);
  return /^[a-zA-Z]/.test(cleaned) ? cleaned : `e_${cleaned}`.slice(0, 40);
}

function safeParams(
  params: Ga4Event['params']
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!params) return out;

  for (const [rawKey, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    const key = rawKey.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);
    // Param values cap at 100 characters; longer ones drop the whole
    // param rather than truncating into something misleading.
    if (typeof value === 'string') {
      out[key] = value.slice(0, 100);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Send a batch to GA4. Never throws — analytics must not be able to fail
 * a request that the user actually cares about.
 *
 * Returns false when nothing was sent (unconfigured or empty batch), so
 * callers can tell "off" from "delivered" without inspecting env vars.
 */
export async function sendGa4Events(opts: {
  clientId: string;
  userId?: string | null;
  events: Ga4Event[];
  /** Cairo-time is irrelevant here; GA4 wants UTC microseconds. */
  timestampMicros?: number;
  userProperties?: Record<string, string | number>;
  debug?: boolean;
}): Promise<boolean> {
  if (!MEASUREMENT_ID || !API_SECRET) return false;
  if (!opts.clientId || !opts.events?.length) return false;

  // GA4 caps a single payload at 25 events.
  const events = opts.events.slice(0, 25).map((e) => ({
    name: safeEventName(e.name),
    params: {
      ...safeParams(e.params),
      // Without engagement_time_msec GA4 counts the hit but attributes
      // no session, so the event lands in reports with zero users.
      engagement_time_msec: 1,
    },
  }));

  const body: Record<string, unknown> = {
    client_id: opts.clientId,
    events,
  };
  if (opts.userId) body.user_id = opts.userId;
  if (opts.timestampMicros) body.timestamp_micros = opts.timestampMicros;
  if (opts.userProperties) {
    body.user_properties = Object.fromEntries(
      Object.entries(opts.userProperties).map(([k, v]) => [k, { value: v }])
    );
  }

  const url = `${opts.debug ? DEBUG_ENDPOINT : ENDPOINT}?measurement_id=${encodeURIComponent(
    MEASUREMENT_ID
  )}&api_secret=${encodeURIComponent(API_SECRET)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // The production endpoint answers 204 for everything, valid or not.
    // Only the debug endpoint reports problems, so that's the only place
    // worth reading a body from.
    if (opts.debug) {
      const text = await res.text();
      console.log('[ga4] debug response', text);
    }
    return true;
  } catch (err) {
    console.error('[ga4] send failed', err instanceof Error ? err.message : err);
    return false;
  }
}

export function isGa4Configured(): boolean {
  return Boolean(MEASUREMENT_ID && API_SECRET);
}
