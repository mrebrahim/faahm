import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import {
  ensureUserForEmail,
  resolveUserIdFromCustomer,
  upsertSubscriptionFromStripe,
} from '@/lib/billing';

// Stripe requires the raw body for signature verification.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

          // Guest checkout path: the session may not carry a
          // supabase_user_id yet because the visitor hadn't signed up.
          // Provision a Supabase user from the captured email so the
          // subscription has somewhere to land — the /billing/success
          // claim form will then let them set a password and sign in.
          let userIdFromSession = session.metadata?.supabase_user_id || null;
          if (!userIdFromSession) {
            const guestEmail =
              (session.metadata?.guest_email as string | undefined) ||
              session.customer_email ||
              session.customer_details?.email ||
              null;
            if (guestEmail) {
              const created = await ensureUserForEmail(guestEmail);
              if (created?.userId) {
                userIdFromSession = created.userId;
              }
            }
          }

          // Stamp the resolved user id on the subscription so future
          // webhook events (renewals, cancellations) link straight to
          // the right Supabase user without re-running the email
          // lookup.
          if (userIdFromSession && !sub.metadata?.supabase_user_id) {
            await stripe.subscriptions.update(subId, {
              metadata: {
                ...sub.metadata,
                supabase_user_id: userIdFromSession,
                plan: session.metadata?.plan || sub.metadata?.plan || '',
              },
            });
            sub.metadata = {
              ...sub.metadata,
              supabase_user_id: userIdFromSession,
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
