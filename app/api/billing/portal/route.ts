import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { ROUTES } from '@/lib/constants';

/**
 * Creates a Stripe Customer Portal session so users can update payment
 * method, change plan, cancel, or view invoices. Stripe handles the UI.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url));
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(new URL(ROUTES.pricing, request.url));
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin.replace(/\/$/, '');

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}${ROUTES.dashboard}`,
  });

  return NextResponse.redirect(session.url, { status: 303 });
}
