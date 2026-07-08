import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ROUTES, PLANS, STRIPE_PAYMENT_LINKS, type PlanId } from '@/lib/constants';
import { resolveAppUrl } from '@/lib/app-url';
import { getPromoState } from '@/lib/promo';

const GUEST_EMAIL_COOKIE = 'guest_checkout_email';

/**
 * Subscription checkout entry point. Instead of calling the Stripe API
 * to mint a Checkout Session, we redirect straight to the pre-built
 * Stripe Payment Link for the chosen plan. Each Payment Link MUST be
 * a subscription Payment Link (mode=subscription) wired to a recurring
 * USD price in Stripe Dashboard — $10/month with interval=month for
 * the monthly plan, $40/year with interval=year for the yearly plan.
 * Stripe then charges the card automatically at the interval; renewals
 * arrive here via 'customer.subscription.updated' + 'invoice.payment_
 * succeeded' webhooks handled by /api/stripe/webhook.
 *
 *   GET /api/checkout?plan=monthly|yearly[&email=user@example.com]
 *
 * `email` (or the guest_checkout_email cookie) is forwarded to Stripe
 * as `prefilled_email` so the visitor doesn't re-enter what they
 * already typed on /checkout.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const planParam = url.searchParams.get('plan');
  const origin = resolveAppUrl();

  if (planParam !== 'monthly' && planParam !== 'yearly') {
    return NextResponse.redirect(`${origin}${ROUTES.pricing}`);
  }
  const plan = planParam as PlanId;

  // Pull the visitor's email so Stripe's Payment Link arrives with
  // it pre-filled. Order: query param → cookie. Empty/missing is fine
  // — Payment Links collect the email themselves if we don't.
  const guestEmailParam =
    url.searchParams.get('email')?.trim().toLowerCase() || null;
  const guestEmailCookie =
    cookies().get(GUEST_EMAIL_COOKIE)?.value?.trim().toLowerCase() || null;
  const email = guestEmailParam || guestEmailCookie || null;

  // Pick the yearly link based on the live promo tier so the payment
  // page never charges a different amount than what was on the sticker.
  // Monthly is not affected by the promo.
  const linkKey: keyof typeof STRIPE_PAYMENT_LINKS =
    plan === 'yearly'
      ? getPromoState().tier === 'deep'
        ? 'yearly_deep'
        : 'yearly_mid'
      : 'monthly';
  const target = new URL(STRIPE_PAYMENT_LINKS[linkKey]);
  if (email) {
    // Stripe Payment Links accept ?prefilled_email=... to seed the
    // customer's email field on the hosted page.
    target.searchParams.set('prefilled_email', email);
  }

  return NextResponse.redirect(target.toString(), { status: 303 });
}

// Hint to consumers what plans we expect (helps debugging).
export async function HEAD() {
  return NextResponse.json({ plans: Object.keys(PLANS) });
}
