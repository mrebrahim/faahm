import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ROUTES, PLANS, STRIPE_PAYMENT_LINKS, type PlanId } from '@/lib/constants';
import { resolveAppUrl } from '@/lib/app-url';

const GUEST_EMAIL_COOKIE = 'guest_checkout_email';

/**
 * Subscription checkout entry point. Instead of calling the Stripe API
 * to mint a Checkout Session, we redirect straight to the pre-built
 * Stripe Payment Link for the chosen plan. The Payment Link is wired
 * to the SAR-priced recurring price in Stripe Dashboard, so the
 * visitor lands on the right currency without us having to manage
 * STRIPE_PRICE_ID_* env vars at runtime. Subscription activation
 * still rides on the existing webhook handler at /api/stripe/webhook.
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

  const target = new URL(STRIPE_PAYMENT_LINKS[plan]);
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
