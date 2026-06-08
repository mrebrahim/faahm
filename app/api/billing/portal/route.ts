import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { ROUTES } from '@/lib/constants';
import { resolveAppUrl } from '@/lib/app-url';

/**
 * Routes the 'manage subscription' click to the right place based on the
 * subscription's gateway:
 *
 *   - stripe : Stripe Customer Portal (update card / cancel / invoices).
 *   - paypal : PayPal's own subscription management page — Stripe portal
 *              can't manage PayPal-billed plans.
 *   - manual : nothing to self-serve; route to /help so support can
 *              handle it.
 *   - none   : send them to /pricing to subscribe.
 *
 * All redirect URLs are built off resolveAppUrl() so behind Coolify /
 * Traefik they carry the public hostname instead of the internal
 * localhost the request URL falls back to.
 */
export async function GET(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _req = request; // kept for the next/server type contract
  const origin = resolveAppUrl();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}${ROUTES.login}`);
  }

  const service = createServiceClient();

  // Pick the most recent active sub — that's the one the dashboard's
  // 'إدارة الاشتراك' button was rendered against.
  const { data: subscription } = await service
    .from('subscriptions')
    .select('gateway, stripe_subscription_id, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription) {
    return NextResponse.redirect(`${origin}${ROUTES.pricing}`);
  }

  if (subscription.gateway === 'paypal') {
    // PayPal hosts its own subscription console; deep-link the specific
    // subscription so users land directly on theirs.
    const subId = subscription.stripe_subscription_id;
    const target = subId
      ? `https://www.paypal.com/myaccount/autopay/connect/${encodeURIComponent(subId)}`
      : 'https://www.paypal.com/myaccount/autopay/';
    return NextResponse.redirect(target, { status: 303 });
  }

  if (subscription.gateway === 'manual') {
    // Manually-granted (admin invite / promo) — no self-serve portal.
    return NextResponse.redirect(`${origin}/help?topic=manual-subscription`);
  }

  // Stripe path — open the hosted Customer Portal.
  const { data: profile } = await service
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(`${origin}${ROUTES.pricing}`);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}${ROUTES.dashboard}`,
  });

  return NextResponse.redirect(session.url, { status: 303 });
}
