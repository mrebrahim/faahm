import { getMobileUser } from '@/lib/mobile-auth';
import { sendGa4Events, isGa4Configured, type Ga4Event } from '@/lib/ga4';

export const dynamic = 'force-dynamic';

/**
 * Analytics intake for the mobile app.
 *
 * The app batches events locally and posts them here; we forward to the
 * same GA4 property the website reports to. Going through our own server
 * rather than an SDK on the device buys three things:
 *
 *   1. It works on Huawei. Firebase Analytics needs Google Play
 *      Services, which those devices don't have.
 *   2. The API secret stays on the server instead of shipping inside
 *      the app binary where anyone can extract it.
 *   3. Adding Meta CAPI or TikTok later is a server change, not an app
 *      release — and app releases take days to reach users.
 *
 * Auth is OPTIONAL. `app_open` and `login_*` fire before anyone has a
 * session, and those are exactly the events a funnel needs; requiring a
 * token would blind us to the top of it. When a token IS present we
 * attach the real user id so app and web sessions stitch together.
 */

/** Hard cap per request — GA4 takes 25, and a larger body is a bug or an attack. */
const MAX_EVENTS = 25;

type Incoming = {
  client_id?: string;
  events?: Array<{ name?: string; params?: Record<string, unknown> }>;
  user_properties?: Record<string, string | number>;
};

export async function POST(request: Request) {
  if (!isGa4Configured()) {
    // Not an error: analytics simply isn't wired up in this environment.
    return Response.json({ ok: true, forwarded: false });
  }

  let body: Incoming;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const clientId = String(body.client_id || '').slice(0, 128);
  if (!clientId) return Response.json({ error: 'client_id_required' }, { status: 400 });

  const rawEvents = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  if (!rawEvents.length) return Response.json({ ok: true, forwarded: false });

  const events: Ga4Event[] = rawEvents
    .filter((e) => typeof e?.name === 'string' && e.name.length > 0)
    .map((e) => ({
      name: e.name as string,
      params: sanitize(e.params),
    }));

  if (!events.length) return Response.json({ ok: true, forwarded: false });

  // Best-effort: an expired token means an anonymous event, not a
  // dropped one.
  const user = await getMobileUser(request).catch(() => null);

  const forwarded = await sendGa4Events({
    clientId,
    userId: user?.id ?? null,
    events,
    userProperties: body.user_properties,
  });

  return Response.json({ ok: true, forwarded });
}

/**
 * Params arrive from a client we don't control, so keep only scalars and
 * drop anything that looks like it could carry personal data by accident.
 * GA4's terms forbid sending PII, and a single email address in a param
 * can get a property terminated.
 */
const BLOCKED_PARAM_KEYS = new Set([
  'email',
  'phone',
  'password',
  'token',
  'full_name',
  'name',
  'address',
]);

function sanitize(params: Record<string, unknown> | undefined) {
  const out: Record<string, string | number | boolean> = {};
  if (!params) return out;

  for (const [key, value] of Object.entries(params)) {
    const lower = key.toLowerCase();
    if (BLOCKED_PARAM_KEYS.has(lower)) continue;
    if (lower.includes('email') || lower.includes('phone')) continue;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}
