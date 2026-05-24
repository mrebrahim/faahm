import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, planFromPriceId } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

// Stripe requires the raw body for signature verification.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SubStatus = 'active' | 'cancelled' | 'expired' | 'paused' | 'trialing';

function mapStripeStatus(s: Stripe.Subscription.Status): SubStatus {
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

async function resolveUserIdFromCustomer(
  service: ReturnType<typeof createServiceClient>,
  customerId: string,
  fallback?: { metadataUserId?: string | null; email?: string | null }
): Promise<string | null> {
  // 1. Try profiles.stripe_customer_id mapping.
  const { data: profile } = await service
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (profile?.id) return profile.id;

  // 2. Fall back to metadata set on checkout / subscription.
  if (fallback?.metadataUserId) {
    await service
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', fallback.metadataUserId);
    return fallback.metadataUserId;
  }

  // 3. Last resort: match by email (paid via Stripe before profile mapped).
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

async function upsertSubscriptionFromStripe(
  service: ReturnType<typeof createServiceClient>,
  sub: Stripe.Subscription
) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const metadataUserId = (sub.metadata?.supabase_user_id as string) || null;

  // Pull customer email as last-resort fallback for user mapping.
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
    console.error('[stripe-webhook] could not resolve user for customer', customerId);
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const plan = planFromPriceId(priceId) || (sub.metadata?.plan as 'monthly' | 'yearly') || 'monthly';

  // current_period_{start,end} moved from Subscription to SubscriptionItem in
  // API version 2025-04-30+. The typed SDK doesn't always expose them on the
  // item, so cast and fall back to the subscription-level field for older accounts.
  const periodEnd =
    (item as any)?.current_period_end ??
    (sub as any).current_period_end ??
    Math.floor(Date.now() / 1000);
  const periodStart =
    (item as any)?.current_period_start ??
    (sub as any).current_period_start ??
    Math.floor(Date.now() / 1000);

  // Try to update existing row by Stripe sub id; otherwise insert.
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
}

async function recordPaymentFromInvoice(
  service: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice,
  status: 'paid' | 'failed'
) {
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id ?? null;
  if (!customerId) return;

  const userId = await resolveUserIdFromCustomer(service, customerId, {
    metadataUserId: (invoice.metadata?.supabase_user_id as string) || null,
    email: invoice.customer_email,
  });
  if (!userId) return;

  const subId =
    typeof (invoice as any).subscription === 'string'
      ? ((invoice as any).subscription as string)
      : (invoice as any).subscription?.id ?? null;

  let subscriptionRowId: string | null = null;
  if (subId) {
    const { data: sub } = await service
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subId)
      .maybeSingle();
    subscriptionRowId = sub?.id ?? null;
  }

  // Idempotency: don't double-insert the same invoice.
  if (invoice.id) {
    const { data: dupe } = await service
      .from('payments')
      .select('id')
      .eq('gateway', 'stripe')
      .eq('gateway_order_id', invoice.id)
      .maybeSingle();
    if (dupe) return;
  }

  await service.from('payments').insert({
    user_id: userId,
    subscription_id: subscriptionRowId,
    amount_cents: invoice.amount_paid || invoice.amount_due || 0,
    currency: (invoice.currency || 'usd').toUpperCase(),
    gateway: 'stripe',
    gateway_order_id: invoice.id ?? null,
    gateway_payment_id:
      typeof (invoice as any).payment_intent === 'string'
        ? ((invoice as any).payment_intent as string)
        : (invoice as any).payment_intent?.id ?? null,
    status,
    metadata: {
      invoice_number: invoice.number,
      hosted_invoice_url: invoice.hosted_invoice_url,
    } as any,
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET missing');
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const service = createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);

          // Stamp the user id from the session if missing.
          if (!sub.metadata?.supabase_user_id && session.metadata?.supabase_user_id) {
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
          }
          await upsertSubscriptionFromStripe(service, sub);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscriptionFromStripe(service, sub);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await recordPaymentFromInvoice(service, invoice, 'paid');
        // Also refresh subscription state so current_period_end is current.
        const subId =
          typeof (invoice as any).subscription === 'string'
            ? ((invoice as any).subscription as string)
            : (invoice as any).subscription?.id ?? null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscriptionFromStripe(service, sub);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await recordPaymentFromInvoice(service, invoice, 'failed');
        break;
      }

      default:
        // Acknowledge unhandled events so Stripe doesn't retry forever.
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error', event.type, err);
    return NextResponse.json({ error: 'handler_error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
