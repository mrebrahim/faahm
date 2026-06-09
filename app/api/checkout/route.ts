import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { stripe, getStripePriceId } from '@/lib/stripe';
import { ROUTES, PLANS, type PlanId } from '@/lib/constants';
import { resolveAppUrl } from '@/lib/app-url';

/**
 * Creates a Stripe Checkout session for a logged-in user and redirects them to it.
 * GET so it can be linked from a <Link>/button without client JS.
 *
 *   GET /api/checkout?plan=monthly|yearly[&redirect=/some/path]
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const planParam = url.searchParams.get('plan');
  const redirectParam = url.searchParams.get('redirect') || ROUTES.dashboard;

  // All redirects below go through the proxy-aware origin so they carry
  // the public hostname instead of the internal localhost request.url
  // falls back to behind Coolify/Traefik.
  const origin = resolveAppUrl();

  if (planParam !== 'monthly' && planParam !== 'yearly') {
    return NextResponse.redirect(`${origin}${ROUTES.pricing}`);
  }
  const plan = planParam as PlanId;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}${ROUTES.login}?redirect=${encodeURIComponent(`/api/checkout?plan=${plan}`)}`
    );
  }

  const service = createServiceClient();

  // Resolve (or create) the user's Stripe customer.
  const { data: profile } = await service
    .from('profiles')
    .select('id, full_name, stripe_customer_id')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id || undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await service.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        price: getStripePriceId(plan),
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
        supabase_user_id: user.id,
        plan,
      },
    },
    metadata: {
      supabase_user_id: user.id,
      plan,
      redirect_after: redirectParam,
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
