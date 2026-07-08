'use server';

import { headers, cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PAYPAL, PLANS, type PlanId } from '@/lib/constants';
import { fetchSubscription } from '@/lib/paypal';
import { ensureUserForEmail } from '@/lib/billing';
import { trackServerEvent } from '@/lib/tracking';
import { pricingFor } from '@/lib/region';

const GUEST_EMAIL_COOKIE = 'guest_checkout_email';

export type ActivatePayPalInput = {
  subscriptionId: string;
  plan: PlanId;
};

export type ActivatePayPalResult = { ok: true } | { ok: false; error: string };

/**
 * Server-side activation for a PayPal subscription approved by the
 * SDK button. Idempotent: replaying the same subscription ID just
 * updates the existing row.
 *
 *   1. Look up the user. Logged-in visitors win; guests fall back
 *      to the email stashed on /checkout (cookie) and we
 *      provision a Supabase user from it the same way the Stripe
 *      guest checkout does.
 *   2. Verify the subscription is genuinely ACTIVE/APPROVED on the
 *      plan_id we expected — protects against the browser posting
 *      any string and getting a free plan.
 *   3. Upsert the subscriptions row (gateway='paypal') with the
 *      period end PayPal reports for next billing.
 *   4. Record a paid payments row so the revenue dashboard counts
 *      it alongside Stripe and the offline channels.
 *   5. Fire the Purchase server event for Meta/TikTok dedupe with
 *      the same eventId the client tracker uses.
 */
export async function activatePayPalSubscription(
  input: ActivatePayPalInput
): Promise<ActivatePayPalResult> {
  const subscriptionId = input.subscriptionId?.trim();
  const plan = input.plan;
  if (!subscriptionId) return { ok: false, error: 'Missing subscription id.' };
  if (plan !== 'monthly' && plan !== 'yearly')
    return { ok: false, error: 'Invalid plan.' };

  // --- 1. Resolve the user --------------------------------------------------
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userId: string | null = user?.id ?? null;
  let userEmail: string | null = user?.email ?? null;
  if (!userId) {
    const guestEmail =
      cookies().get(GUEST_EMAIL_COOKIE)?.value?.toLowerCase() || null;
    if (!guestEmail) {
      return {
        ok: false,
        error: 'لازم تسجّل دخول أو تكتب إيميلك من صفحة الدفع الأول.',
      };
    }
    const provisioned = await ensureUserForEmail(guestEmail);
    if (!provisioned?.userId) {
      return { ok: false, error: 'مش قادر نعمل حساب على الإيميل ده.' };
    }
    userId = provisioned.userId;
    userEmail = guestEmail;
  }

  // --- 2. Verify with PayPal -----------------------------------------------
  let sub;
  try {
    sub = await fetchSubscription(subscriptionId);
  } catch (e) {
    console.error('[paypal] verify failed', e);
    return { ok: false, error: 'فشل التحقق من الاشتراك مع PayPal.' };
  }
  if (sub.status !== 'ACTIVE' && sub.status !== 'APPROVED') {
    return { ok: false, error: `حالة الاشتراك مش مفعّلة (${sub.status}).` };
  }
  // Accept either yearly plan_id (mid or deep) — the promo tier may have
  // flipped between the SDK's createSubscription() call and this verify
  // running (visitor lingered on the button past midnight of a boundary
  // day). Monthly only has one plan_id, so it's a straight equality check.
  const acceptable: string[] =
    plan === 'yearly'
      ? [PAYPAL.plans.yearly_mid, PAYPAL.plans.yearly_deep]
      : [PAYPAL.plans.monthly];
  if (!acceptable.includes(sub.plan_id)) {
    console.error('[paypal] plan mismatch', { got: sub.plan_id, want: acceptable });
    return { ok: false, error: 'الخطة المُختارة مش مطابقة.' };
  }

  // --- 3. Persist subscription + payment -----------------------------------
  const planInfo = PLANS[plan];
  const now = new Date();
  const periodEnd = sub.billing_info?.next_billing_time
    ? new Date(sub.billing_info.next_billing_time)
    : new Date(now.getTime() + (plan === 'yearly' ? 365 : 30) * 86_400_000);

  const service = createServiceClient();

  // Upsert by stripe_subscription_id-style key — we store the PayPal id in
  // the same column so cancel/reconcile flows are uniform.
  await service.from('subscriptions').upsert(
    {
      user_id: userId,
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
    user_id: userId,
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

  // --- 4. Track Purchase server-side ---------------------------------------
  const h = headers();
  const c = cookies();
  const ipChain = h.get('x-forwarded-for') ?? '';
  const ipAddress = ipChain.split(',')[0]?.trim() || h.get('x-real-ip') || null;
  const eventId = `purchase-paypal-${subscriptionId}`;
  // Report the SAR amount the visitor actually paid, not the legacy
  // USD figure baked into PLANS — see /billing/success for the same
  // reasoning. Meta + TikTok bid optimisation use this value.
  const saPricing = pricingFor('us');
  const trackingValue = Number(
    plan === 'yearly' ? saPricing.yearlyAmount : saPricing.monthlyAmount
  );
  void trackServerEvent({
    eventName: 'Purchase',
    eventId,
    user: {
      email: userEmail,
      externalId: userId,
      ipAddress,
      userAgent: h.get('user-agent'),
      fbp: c.get('_fbp')?.value,
      fbc: c.get('_fbc')?.value,
      ttp: c.get('_ttp')?.value,
    },
    eventSourceUrl: h.get('referer') ?? undefined,
    custom: {
      value: trackingValue,
      currency: 'USD',
      contentName: planInfo.name,
      contentIds: [plan],
    },
  });

  return { ok: true };
}
