import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { trackServerEvent } from '@/lib/tracking';

/**
 * Generic server-side conversion endpoint. Client trackers POST here
 * after firing their pixel client-side; we forward the same event to
 * Meta Conversions API and TikTok Events API with the request's
 * server-side context (IP, User-Agent, _fbp/_fbc/_ttp cookies) so the
 * event arrives even when Safari ITP or an ad-blocker swallows the
 * client pixel.
 *
 * Dedup: the client passes the SAME eventId it gave to fbq() / ttq();
 * Meta + TikTok then collapse the client + server hits into one
 * conversion server-side.
 *
 * Events expected: lp_view, pricing_viewed, InitiateCheckout (and
 * any future custom funnel event — eventName is passed through).
 * Purchase is fired from /billing/success directly because the
 * server already has the gateway txn id.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  eventName: string;
  eventId: string;
  sourceUrl?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
};

function isAllowedEvent(name: string): boolean {
  // Whitelist — keeps random POSTs from inflating ad-spend metrics.
  return (
    name === 'lp_view' ||
    name === 'pricing_viewed' ||
    name === 'InitiateCheckout' ||
    name === 'ViewContent' ||
    name === 'Lead' ||
    name === 'AddToCart'
  );
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 });
  }

  if (!body?.eventName || !body?.eventId) {
    return NextResponse.json(
      { ok: false, error: 'missing eventName/eventId' },
      { status: 400 }
    );
  }
  if (!isAllowedEvent(body.eventName)) {
    return NextResponse.json(
      { ok: false, error: 'event not allowed' },
      { status: 400 }
    );
  }

  const h = headers();
  const c = cookies();

  // Best-effort visitor identity: signed-in users contribute email +
  // user_id (hashed downstream in trackServerEvent), guests fall back
  // to cookie/IP/UA matching only.
  let email: string | null = null;
  let externalId: string | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      email = user.email ?? null;
      externalId = user.id;
    }
  } catch {
    /* anon — fine */
  }

  const ipChain = h.get('x-forwarded-for') ?? '';
  const ipAddress =
    ipChain.split(',')[0]?.trim() || h.get('x-real-ip') || null;

  // Fire-and-await both networks; trackServerEvent already wraps each
  // in its own try/catch so a downed Meta endpoint can't take TikTok
  // with it. We await so the function doesn't return before the
  // outgoing fetches even start (Vercel/Coolify can kill the request
  // on response).
  await trackServerEvent({
    eventName: body.eventName,
    eventId: body.eventId,
    eventSourceUrl: body.sourceUrl ?? h.get('referer') ?? undefined,
    user: {
      email,
      externalId,
      ipAddress,
      userAgent: h.get('user-agent'),
      fbp: c.get('_fbp')?.value,
      fbc: c.get('_fbc')?.value,
      ttp: c.get('_ttp')?.value,
    },
    custom: {
      value: body.value,
      currency: body.currency,
      contentName: body.contentName,
      contentIds: body.contentIds,
    },
  });

  return NextResponse.json({ ok: true });
}
