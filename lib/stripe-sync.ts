import type Stripe from 'stripe';
import { stripe, planFromPriceId } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

type SubStatus = 'active' | 'cancelled' | 'expired' | 'paused' | 'trialing';

export function mapStripeStatus(s: Stripe.Subscription.Status): SubStatus {
  switch (s) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'paused':
      return 'paused';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'expired';
    case 'canceled':
      return 'cancelled';
    default:
      return 'expired';
  }
}

export async function resolveUserIdFromCustomer(
  service: ReturnType<typeof createServiceClient>,
  customerId: string,
  fallback?: { metadataUserId?: string | null; email?: string | null }
): Promise<string | null> {
  const { data: profile } = await service
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (profile?.id) return profile.id;

  if (fallback?.metadataUserId) {
    await service
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', fallback.metadataUserId);
    return fallback.metadataUserId;
  }

  if (fallback?.email) {
    const { data: byEmail } = await service.auth.admin.listUsers();
    const match = byEmail?.users.find(
      (u) => u.email?.toLowerCase() === fallback.email!.toLowerCase()
    );
    if (match?.id) {
      await service
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', match.id);
      return match.id;
    }
  }

  return null;
}

/**
 * Idempotent: upserts the subscriptions row that matches `sub.id`. Safe to call
 * from both the Stripe webhook and the post-checkout success page — whichever
 * fires first wins, and the loser is a no-op update with the same values.
 */
export async function upsertSubscriptionFromStripe(
  service: ReturnType<typeof createServiceClient>,
  sub: Stripe.Subscription
): Promise<{ ok: boolean; userId: string | null }> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const metadataUserId = (sub.metadata?.supabase_user_id as string) || null;

  let email: string | null = null;
  if (!metadataUserId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) email = customer.email;
    } catch {
      // ignore
    }
  }

  const userId = await resolveUserIdFromCustomer(service, customerId, {
    metadataUserId,
    email,
  });
  if (!userId) {
    console.error('[stripe-sync] could not resolve user for customer', customerId);
    return { ok: false, userId: null };
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const plan =
    planFromPriceId(priceId) || (sub.metadata?.plan as 'monthly' | 'yearly') || 'monthly';

  // current_period_{start,end} moved from Subscription to SubscriptionItem in
  // API version 2025-04-30+. Fall back to the subscription-level field for
  // older accounts.
  const periodEnd =
    (item as any)?.current_period_end ??
    (sub as any).current_period_end ??
    Math.floor(Date.now() / 1000);
  const periodStart =
    (item as any)?.current_period_start ??
    (sub as any).current_period_start ??
    Math.floor(Date.now() / 1000);

  const { data: existing } = await service
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle();

  const row = {
    user_id: userId,
    plan,
    status: mapStripeStatus(sub.status),
    current_period_start: new Date(periodStart * 1000).toISOString(),
    current_period_end: new Date(periodEnd * 1000).toISOString(),
    cancelled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    gateway: 'stripe' as const,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
  };

  if (existing) {
    await service.from('subscriptions').update(row).eq('id', existing.id);
  } else {
    await service.from('subscriptions').insert(row);
  }
  return { ok: true, userId };
}

/**
 * Provisions the user's subscription from a freshly-completed Checkout
 * session. Used by the /billing/success page so access works even if the
 * Stripe webhook is misconfigured or hasn't fired yet. No-op if the session
 * isn't paid or isn't a subscription checkout.
 */
export async function provisionFromCheckoutSession(
  sessionId: string
): Promise<{ ok: boolean; reason?: string; userId?: string | null }> {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    return { ok: false, reason: 'retrieve_failed' };
  }

  if (session.mode !== 'subscription' || !session.subscription) {
    return { ok: false, reason: 'not_subscription' };
  }

  // payment_status is 'paid' for one-time and 'no_payment_required' for
  // trials; both mean we should provision.
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    return { ok: false, reason: 'not_paid' };
  }

  const subId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
  const sub = await stripe.subscriptions.retrieve(subId);

  // Stamp the user id from the session metadata onto the subscription if
  // missing, mirroring the webhook handler's behavior.
  if (!sub.metadata?.supabase_user_id && session.metadata?.supabase_user_id) {
    try {
      await stripe.subscriptions.update(subId, {
        metadata: {
          ...sub.metadata,
          supabase_user_id: session.metadata.supabase_user_id,
          plan: session.metadata.plan || sub.metadata?.plan || '',
        },
      });
      sub.metadata = {
        ...sub.metadata,
        supabase_user_id: session.metadata.supabase_user_id,
      };
    } catch {
      // best-effort
    }
  }

  const service = createServiceClient();
  const result = await upsertSubscriptionFromStripe(service, sub);
  return { ok: result.ok, userId: result.userId };
}
