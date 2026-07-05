import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook for the dubbing service. Deliberately separate
 * from the subscription webhook so a signature-verification bug
 * on one surface can't take the other down.
 *
 * Only reacts to `checkout.session.completed` events whose metadata
 * is stamped `service=dubbing`. Anything else — subscription hits,
 * test pings, out-of-band charges — is acknowledged with a 200 and
 * ignored, per Stripe's retry guidance.
 *
 * Endpoint secret: STRIPE_DUBBING_WEBHOOK_SECRET  (unique per event
 * source in Stripe Dashboard).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_DUBBING_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[dubbing/webhook] STRIPE_DUBBING_WEBHOOK_SECRET missing');
    return NextResponse.json({ ok: false, error: 'not-configured' }, { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ ok: false, error: 'missing-signature' }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('[dubbing/webhook] signature verify failed', (err as Error).message);
    return NextResponse.json({ ok: false, error: 'bad-signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // Ack anything else so Stripe stops retrying. We only care about
    // completed checkouts.
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  if (metadata.service !== 'dubbing') {
    return NextResponse.json({ ok: true, ignored: 'not-dubbing' });
  }
  const orderId = metadata.order_id;
  if (!orderId) {
    console.warn('[dubbing/webhook] missing order_id on metadata', session.id);
    return NextResponse.json({ ok: true, ignored: 'no-order-id' });
  }

  const service = createServiceClient();
  const patch: Record<string, unknown> = {
    status: 'paid',
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Trust the Stripe-captured email over what the customer typed on
  // the form — it's the one that actually paid.
  if (session.customer_email) {
    patch.email = session.customer_email;
  }

  const { error } = await service
    .from('dubbing_orders')
    .update(patch)
    .eq('id', orderId)
    .in('status', ['pending_payment', 'paid']); // idempotent

  if (error) {
    console.error('[dubbing/webhook] update failed', error);
    return NextResponse.json(
      { ok: false, error: 'db-update-failed', detail: error.message },
      { status: 500 }
    );
  }

  console.log(`[dubbing/webhook] order=${orderId} → paid (session=${session.id})`);
  return NextResponse.json({ ok: true });
}
