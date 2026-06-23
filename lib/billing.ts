import type Stripe from 'stripe';
import { stripe, planFromPriceId } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

type ServiceClient = ReturnType<typeof createServiceClient>;

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
  service: ServiceClient,
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

export async function upsertSubscriptionFromStripe(
  service: ServiceClient,
  sub: Stripe.Subscription
): Promise<string | null> {
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
    console.error('[billing] could not resolve user for customer', customerId);
    return null;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const plan = planFromPriceId(priceId) || (sub.metadata?.plan as 'monthly' | 'yearly') || 'monthly';

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

  return userId;
}

/**
 * Server-side reconcile for the /billing/success landing.
 * Stripe redirects to success_url immediately after payment, but the webhook
 * is async — sometimes the row isn't there yet when the user lands. We
 * retrieve the session, write the subscription row ourselves, and let the
 * webhook (which is idempotent on stripe_subscription_id) catch up later.
 */
export async function reconcileCheckoutSession(
  sessionId: string
): Promise<{
  ok: boolean;
  paid: boolean;
  reason?: string;
  userId?: string | null;
  email?: string | null;
  /** True when the user was provisioned just now (guest checkout). */
  newAccount?: boolean;
}> {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
  } catch (err) {
    return { ok: false, paid: false, reason: 'session_not_found' };
  }

  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    return { ok: false, paid: false, reason: 'unpaid' };
  }

  if (session.mode !== 'subscription' || !session.subscription) {
    return { ok: true, paid: true, reason: 'not_subscription' };
  }

  const subId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

  const sub = await stripe.subscriptions.retrieve(subId);

  // Guest checkout: the session may not yet carry a supabase_user_id
  // (the visitor paid before signing up). Provision the user here from
  // the email Stripe captured so the success page can land them with a
  // working account; the webhook does the same thing idempotently a
  // few seconds later.
  let resolvedUserId = session.metadata?.supabase_user_id || null;
  let provisionedNow = false;
  const sessionEmail =
    (session.metadata?.guest_email as string | undefined) ||
    session.customer_email ||
    session.customer_details?.email ||
    null;
  if (!resolvedUserId && sessionEmail) {
    const created = await ensureUserForEmail(sessionEmail);
    if (created?.userId) {
      resolvedUserId = created.userId;
      provisionedNow = created.isNew;
    }
  }

  // Stamp the subscription's metadata so future webhook events can link
  // back without re-doing the email lookup.
  if (resolvedUserId && !sub.metadata?.supabase_user_id) {
    try {
      await stripe.subscriptions.update(subId, {
        metadata: {
          ...sub.metadata,
          supabase_user_id: resolvedUserId,
          plan: session.metadata?.plan || sub.metadata?.plan || '',
        },
      });
      sub.metadata = {
        ...sub.metadata,
        supabase_user_id: resolvedUserId,
      };
    } catch {
      // best-effort
    }
  }

  const service = createServiceClient();
  await upsertSubscriptionFromStripe(service, sub);
  return {
    ok: true,
    paid: true,
    userId: resolvedUserId,
    email: sessionEmail,
    newAccount: provisionedNow,
  };
}

/**
 * Find the Supabase user that owns `email`, or create a fresh one if it
 * doesn't exist yet. Used by the guest checkout flow: a visitor pays
 * before signing up, so the payment webhook / success-page reconcile
 * has to provision the account so the subscription has a user to hang
 * off.
 *
 * The created user starts with a random password the caller doesn't
 * know — `/billing/success` then prompts the guest to set their own
 * password via auth.admin.updateUserById (see app/billing/success/actions.ts).
 *
 * Returns `{ userId, isNew }` so the caller can show the appropriate
 * post-payment UI (claim password vs. just sign in).
 */
export async function ensureUserForEmail(
  email: string
): Promise<{ userId: string; isNew: boolean } | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return null;

  const service = createServiceClient();

  // Look up an existing auth user by email. listUsers paginates, but we
  // expect the email to be unique so the first match is enough.
  const { data: existing } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const match = existing?.users.find(
    (u) => u.email?.toLowerCase() === normalized
  );
  if (match?.id) {
    return { userId: match.id, isNew: false };
  }

  // Generate a random throwaway password — the user will set their real
  // one on the success page. We mark the email as confirmed so they can
  // sign in immediately after setting a password (no verification email
  // gating the flow they just paid for).
  const randomPassword = `tmp_${crypto.randomUUID()}_${Date.now().toString(36)}`;
  const { data: created, error } = await service.auth.admin.createUser({
    email: normalized,
    password: randomPassword,
    email_confirm: true,
    user_metadata: { provisioned_by: 'guest_checkout' },
  });
  if (error || !created?.user?.id) {
    console.error('[billing] ensureUserForEmail createUser failed', error);
    return null;
  }
  return { userId: created.user.id, isNew: true };
}
