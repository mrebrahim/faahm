import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reader endpoint for the /service-thankyou page. Looks the order
 * up by the Stripe session id and returns just the fields the
 * thank-you view needs — never the raw video links (they belong in
 * the merchant's admin, not the customer's URL bar) or the internal
 * status flags.
 *
 * Anyone who has the session_id (i.e. the paying customer's return
 * URL) can read this — the URL is a bearer-token equivalent, which
 * is the same model Stripe's checkout uses.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')?.trim();
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: 'missing session_id' },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const { data: order, error } = await service
    .from('dubbing_orders')
    .select(
      'id, name, email, whatsapp, video_count, minutes, source_lang, target_lang, dialect, amount_usd, status, paid_at, created_at'
    )
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'db-read-failed', detail: error.message },
      { status: 500 }
    );
  }
  if (!order) {
    return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order });
}
