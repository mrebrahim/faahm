import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveAppUrl } from '@/lib/app-url';
import {
  DUBBING_USD_PER_MINUTE,
  dubbingTotalUsd,
  validateMinutes,
  isEmailish,
  normaliseLinks,
} from '@/lib/dubbing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Dubbing checkout: creates a Stripe Checkout Session with a
 * dynamic price built server-side from a validated minutes count.
 * The customer's total is (minutes × $2), so we cannot use a
 * pre-configured Stripe Payment Link — we have to open a session
 * with price_data + quantity every request.
 *
 * Flow:
 *   1. Validate the request shape server-side. Never trust the
 *      client's total field.
 *   2. Insert a row into dubbing_orders with status pending_payment.
 *   3. Open a Stripe Checkout Session; success_url points at
 *      /service-thankyou which reads the paid state from the DB.
 *   4. Return { url } so the client can window.location.assign.
 */
export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    whatsapp?: string;
    videoLinks?: string;
    minutes?: number | string;
    sourceLang?: string;
    targetLang?: string;
    dialect?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const whatsapp = (body.whatsapp ?? '').trim();
  const videoLinks = String(body.videoLinks ?? '').trim();
  const links = normaliseLinks(videoLinks);
  // Derive video count from the number of pasted lines so the merchant
  // still sees it in Supabase for scheduling, without asking the
  // customer to type a redundant number.
  const videoCount = Math.max(1, links.length);
  const minutes = validateMinutes(body.minutes);
  const sourceLang = (body.sourceLang ?? '').trim().slice(0, 60) || null;
  const targetLang = (body.targetLang ?? '').trim().slice(0, 60) || null;
  // Dialect only matters when the target is Arabic. Any dialect
  // string arriving with a non-Arabic target is discarded so we don't
  // stash 'مصري' next to a French dubbing order.
  const rawDialect = typeof body.dialect === 'string' ? body.dialect.trim() : '';
  const dialect =
    targetLang === 'العربية' && rawDialect ? rawDialect.slice(0, 60) : null;

  if (!name) {
    return NextResponse.json({ ok: false, error: 'name-required' }, { status: 400 });
  }
  if (!isEmailish(email)) {
    return NextResponse.json({ ok: false, error: 'email-invalid' }, { status: 400 });
  }
  if (!whatsapp) {
    return NextResponse.json({ ok: false, error: 'whatsapp-required' }, { status: 400 });
  }
  if (links.length === 0) {
    return NextResponse.json({ ok: false, error: 'links-required' }, { status: 400 });
  }
  if (minutes == null) {
    return NextResponse.json(
      { ok: false, error: 'minutes-out-of-range' },
      { status: 400 }
    );
  }

  const amountUsd = dubbingTotalUsd(minutes);

  // Persist the order BEFORE opening Stripe — that way the merchant
  // sees the intent even if Stripe fails, and we have a stable
  // order_id to stash on the session metadata.
  const service = createServiceClient();
  const { data: order, error: insertErr } = await service
    .from('dubbing_orders')
    .insert({
      name,
      email,
      whatsapp,
      video_links: links.join('\n'),
      video_count: videoCount,
      minutes,
      source_lang: sourceLang,
      target_lang: targetLang,
      dialect,
      amount_usd: amountUsd,
      status: 'pending_payment',
    })
    .select('id')
    .single();

  if (insertErr || !order) {
    console.error('[dubbing] insert failed', insertErr);
    return NextResponse.json(
      { ok: false, error: 'db-insert-failed', detail: insertErr?.message },
      { status: 500 }
    );
  }

  const origin = resolveAppUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          quantity: minutes,
          price_data: {
            currency: 'usd',
            unit_amount: DUBBING_USD_PER_MINUTE * 100, // cents per minute
            product_data: {
              name: 'خدمة دبلجة الفيديوهات — faahm.com',
              description: [
                sourceLang ? `من: ${sourceLang}` : null,
                targetLang ? `إلى: ${targetLang}` : null,
                dialect ? `اللهجة: ${dialect}` : null,
                `إجمالي الدقائق: ${minutes}`,
              ]
                .filter(Boolean)
                .join(' · '),
            },
          },
        },
      ],
      metadata: {
        service: 'dubbing',
        order_id: order.id,
        minutes: String(minutes),
      },
      success_url: `${origin}/service-thankyou?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/video-dubbing`,
    });

    // Persist the session id so the webhook can look the order up.
    await service
      .from('dubbing_orders')
      .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error('[dubbing] stripe session failed', err);
    return NextResponse.json(
      { ok: false, error: 'stripe-session-failed', detail: (err as Error).message },
      { status: 502 }
    );
  }
}
