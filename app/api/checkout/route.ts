import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { stripe, getStripePriceId } from '@/lib/stripe';
import { ROUTES, PLANS, type PlanId } from '@/lib/constants';
import { resolveAppUrl } from '@/lib/app-url';
import { resolveRegion } from '@/lib/region';

const GUEST_EMAIL_COOKIE = 'guest_checkout_email';

/**
 * Creates a Stripe Checkout session and redirects the visitor to it.
 * Supports both signed-in users AND guests — guests provide their email
 * on /checkout, which is stashed in a cookie / passed as ?email=, and
 * we hand it to Stripe as customer_email so the receipt + webhook get
 * the right address. The /billing/success page then provisions the
 * Supabase account from that email.
 *
 *   GET /api/checkout?plan=monthly|yearly[&email=user@example.com][&redirect=/some/path]
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const planParam = url.searchParams.get('plan');
  const redirectParam = url.searchParams.get('redirect') || ROUTES.dashboard;

  const origin = resolveAppUrl();

  if (planParam !== 'monthly' && planParam !== 'yearly') {
    return NextResponse.redirect(`${origin}${ROUTES.pricing}`);
  }
  const plan = planParam as PlanId;

  // Region picks which Stripe Price ID (USD vs SAR) we hand to Stripe.
  // Falls through to the cookie / CDN-country header for visitors who
  // got here without ?region= on the URL.
  const region = resolveRegion(url.searchParams.get('region'));

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pick the email Stripe should attach to the customer. Logged-in users'
  // auth email always wins; for guests we accept ?email= (set by /checkout
  // when it forwarded the user here) or fall back to the cookie that the
  // checkout page just wrote.
  const guestEmailParam = url.searchParams.get('email')?.trim().toLowerCase() || null;
  const guestEmailCookie =
    cookies().get(GUEST_EMAIL_COOKIE)?.value?.trim().toLowerCase() || null;
  const checkoutEmail =
    user?.email?.toLowerCase() || guestEmailParam || guestEmailCookie || null;

  // Guests still need *some* email — without it the receipt + future
  // account claim are broken. Send them back to /checkout to fill it in.
  if (!user && !checkoutEmail) {
    return NextResponse.redirect(`${origin}/checkout?plan=${plan}`);
  }

  const service = createServiceClient();

  // For signed-in users, re-use (or create) the Stripe customer attached
  // to their profile. For guests we let Stripe spin up a fresh customer
  // from `customer_email` below — they don't have a profile row to bind
  // to yet, and the webhook will reconcile once the account is
  // provisioned in /billing/success.
  let customerId: string | undefined;
  if (user) {
    const { data: profile } = await service
      .from('profiles')
      .select('id, full_name, stripe_customer_id')
      .eq('id', user.id)
      .single();

    customerId = profile?.stripe_customer_id || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await service
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    // For signed-in users we pass the linked customer; for guests we let
    // Stripe create one keyed off the email. Both can't be set at once.
    ...(customerId
      ? { customer: customerId }
      : { customer_email: checkoutEmail ?? undefined }),
    line_items: [
      {
        price: getStripePriceId(plan, region),
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    // Stripe Checkout doesn't support 'ar' as a locale; fall back to the
    // browser default so users in the MENA region get English at worst.
    locale: 'auto',
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing/cancel`,
    subscription_data: {
      metadata: {
        ...(user ? { supabase_user_id: user.id } : {}),
        plan,
        region,
        // Stamp the email for guest flows so the webhook can find / create
        // the user even if customer_email rotates later in Stripe.
        ...(checkoutEmail ? { guest_email: checkoutEmail } : {}),
      },
    },
    metadata: {
      ...(user ? { supabase_user_id: user.id } : {}),
      plan,
      region,
      redirect_after: redirectParam,
      ...(checkoutEmail ? { guest_email: checkoutEmail } : {}),
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 });
  }

  return NextResponse.redirect(session.url, { status: 303 });
}

// Hint to consumers what plans we expect (helps debugging).
export async function HEAD() {
  return NextResponse.json({ plans: Object.keys(PLANS) });
}
