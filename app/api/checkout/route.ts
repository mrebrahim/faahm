import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { stripe, getStripePriceId } from '@/lib/stripe';
import { ROUTES, PLANS, type PlanId } from '@/lib/constants';

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

  if (planParam !== 'monthly' && planParam !== 'yearly') {
    return NextResponse.redirect(new URL(ROUTES.pricing, request.url));
  }
  const plan = planParam as PlanId;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(`${ROUTES.login}?redirect=${encodeURIComponent(`/api/checkout?plan=${plan}`)}`, request.url)
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

  // Don't double-subscribe.
  const { data: activeSub } = await service
    .from('subscriptions')
    .select('id, status, current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', new Date().toISOString())
    .maybeSingle();

  if (activeSub) {
    // Send them to the billing portal to manage instead of starting a new sub.
    return NextResponse.redirect(new URL('/api/billing/portal', request.url));
  }

  // Build the absolute URL Stripe will redirect back to. Prefer the
  // reverse-proxy's forwarded host so we follow the domain the user is
  // actually on (Coolify/Traefik, sslip.io, custom domain). NEXT_PUBLIC_*
  // is inlined at build time, so falling back to it can freeze localhost
  // into prod if the build-arg wasn't passed — only use it as a last resort.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const appUrl = forwardedHost
    ? `${forwardedProto || 'https'}://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/$/, '');

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
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing/cancel`,
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
