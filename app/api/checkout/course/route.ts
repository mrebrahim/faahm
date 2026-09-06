import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { resolveAppUrl } from '@/lib/app-url';
import { productById, AI_BUNDLE, BUNDLE_SAVINGS_USD } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GUEST_EMAIL_COOKIE = 'guest_checkout_email';

/**
 * One-off purchase checkout — the $60 courses and the $99 bundle.
 *
 *   GET /api/checkout/course?product=n8n|ai-video|vibe-coding|ai-bundle
 *
 * Unlike the subscription funnel (which redirects to pre-built Stripe
 * Payment Links), this opens a Checkout Session with inline
 * `price_data`. That means the merchant creates NOTHING in the Stripe
 * dashboard — no products, no prices, no payment links — and a price
 * change is a one-line edit in lib/catalog.ts that can't drift from
 * what the marketing pages print. Same approach the dubbing service
 * already uses.
 *
 * A GET (rather than a POST) keeps every call site a plain <Link>,
 * matching /api/checkout?plan=…
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = resolveAppUrl();

  const product = productById(url.searchParams.get('product'));
  if (!product) {
    return NextResponse.redirect(`${origin}/pricing`, { status: 303 });
  }

  // Email, in order of trust: the signed-in user, then an explicit
  // query param, then whatever /checkout stashed. Any of them is fine —
  // Stripe collects it itself if we have nothing.
  let email: string | null = null;
  let userId: string | null = null;
  try {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (user) {
      userId = user.id;
      email = user.email ?? null;
    }
  } catch {
    // Signed-out visitor — expected on the marketing pages.
  }

  if (!email) {
    email =
      url.searchParams.get('email')?.trim().toLowerCase() ||
      cookies().get(GUEST_EMAIL_COOKIE)?.value?.trim().toLowerCase() ||
      null;
  }

  const isBundle = product.id === AI_BUNDLE.id;
  const description = isBundle
    ? `أتمتة n8n + AI Video Master + Vibe Coding — وصول دائم · وفّر $${BUNDLE_SAVINGS_USD}`
    : 'وصول دائم للكورس — من غير اشتراك ولا تجديد';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      ...(email ? { customer_email: email } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: product.priceUsd * 100,
            product_data: {
              name: `${product.titleAr} — faahm.com`,
              description,
            },
          },
        },
      ],
      // The webhook and the success page both read this to work out what
      // to unlock. `supabase_user_id` is only present for a signed-in
      // buyer; a guest is matched by the email Stripe collects.
      metadata: {
        service: 'course',
        product: product.id,
        ...(userId ? { supabase_user_id: userId } : {}),
      },
      success_url: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${isBundle ? '/ai-bundle' : `/course/${product.slugs[0]}`}`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error('Stripe returned a session with no URL');
    }
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    console.error('[checkout/course] session failed', err);
    // Don't strand the buyer on a stack trace — send them somewhere
    // that can still take their money.
    return NextResponse.redirect(
      `${origin}/pricing?error=checkout_failed`,
      { status: 303 }
    );
  }
}
