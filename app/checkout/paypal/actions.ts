'use server';

import { headers, cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PAYPAL, PLANS, type PlanId } from '@/lib/constants';
import { fetchSubscription } from '@/lib/paypal';
import { trackServerEvent } from '@/lib/tracking';

export type ActivatePayPalInput = {
  subscriptionId: string;
  plan: PlanId;
};

export type ActivatePayPalResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Server-side activation:
 *   1. Verify the caller is logged in (we'll grant access to their user).
 *   2. Hit PayPal REST to look up the subscription and confirm it is
 *      genuinely ACTIVE on the plan we expect — protects against the
 *      browser posting any string and getting a free plan.
 *   3. Upsert the subscriptions row (gateway='paypal') with the period
 *      end PayPal reports for next billing.
 *   4. Record a paid 'payments' row so the revenue dashboard counts it
 *      alongside Stripe and the offline channels.
 *   5. Fire the Purchase server event for Meta/TikTok dedupe with the
 *      same eventId used by the client tracker.
 */
export async function activatePayPalSubscription(
  input: ActivatePayPalInput
): Promise<ActivatePayPalResult> {
  const subscriptionId = input.subscriptionId?.trim();
  const plan = input.plan;
  if (!subscriptionId) return { ok: false, error: 'Missing subscription id.' };
  if (plan !== 'monthly' && plan !== 'yearly')
    return { ok: false, error: 'Invalid plan.' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'لازم تسجّل دخول الأول.' };

  // --- 1. Verify with PayPal -------------------------------------------------
  let sub;
  try {
    sub = await fetchSubscription(subscriptionId);
  } catch (e) {
    console.error('[paypal] verify failed', e);
    return { ok: false, error: 'فشل التحقق من الاشتراك مع PayPal.' };
  }
  if (sub.status !== 'ACTIVE' && sub.status !== 'APPROVED') {
    return {
      ok: false,
      error: `حالة الاشتراك مش مفعّلة (${sub.status}).`,
    };
  }
  const expectedPlanId = PAYPAL.plans[plan];
  if (sub.plan_id !== expectedPlanId) {
    console.error('[paypal] plan mismatch', { got: sub.plan_id, want: expectedPlanId });
    return { ok: false, error: 'الخطة المُختارة مش مطابقة.' };
  }

  // --- 2. Persist subscription + payment ------------------------------------
  const planInfo = PLANS[plan];
  const now = new Date();
  const periodEnd = sub.billing_info?.next_billing_time
    ? new Date(sub.billing_info.next_billing_time)
    : new Date(
        now.getTime() + (plan === 'yearly' ? 365 : 30) * 86_400_000
      );

  const service = createServiceClient();

  // Upsert by stripe_subscription_id-style key — we store the PayPal id in
  // the same column so cancel/reconcile flows are uniform.
  await service.from('subscriptions').upsert(
    {
      user_id: user.id,
      plan,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      gateway: 'paypal',
      stripe_subscription_id: subscriptionId,
      cancelled_at: null,
    },
    { onConflict: 'stripe_subscription_id' }
  );

  await service.from('payments').insert({
    user_id: user.id,
    amount_cents: planInfo.priceCents,
    currency: planInfo.currency,
    gateway: 'paypal',
    status: 'paid',
    gateway_order_id: subscriptionId,
    metadata: {
      source: 'paypal_subscription',
      paypal_plan_id: sub.plan_id,
      paypal_subscriber_email: sub.subscriber?.email_address ?? null,
    },
  });

  // --- 3. Track Purchase server-side ----------------------------------------
  const h = headers();
  const c = cookies();
  const ipChain = h.get('x-forwarded-for') ?? '';
  const ipAddress = ipChain.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const eventId = `purchase-paypal-${subscriptionId}`;
  void trackServerEvent({
    eventName: 'Purchase',
    eventId,
    user: {
      email: user.email,
      externalId: user.id,
      ipAddress,
      userAgent: h.get('user-agent'),
      fbp: c.get('_fbp')?.value,
      fbc: c.get('_fbc')?.value,
      ttp: c.get('_ttp')?.value,
    },
    eventSourceUrl: h.get('referer') ?? undefined,
    custom: {
      value: planInfo.price,
      currency: planInfo.currency,
      contentName: planInfo.name,
      contentIds: [plan],
    },
  });

  return { ok: true };
}
