'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { PlanId } from '@/lib/constants';
import { notifyAbandonment } from '@/lib/abandonment';

const GUEST_EMAIL_COOKIE = 'guest_checkout_email';

/**
 * Stash the visitor's email in a server cookie so every payment gateway
 * (Stripe customer_email, PayPal pre-fill, offline confirmation message)
 * picks up the same value, and so the /billing/success claim flow knows
 * who to provision an account for if the visitor never signed up.
 *
 * Also fires the email at the n8n recovery webhook the moment the
 * visitor surrenders it — that's the earliest possible signal we have
 * for a potential abandonment, and the recovery sequence runs from
 * that timestamp. n8n dedups against later "paid" pings, so firing
 * here even on visitors who do complete the purchase is harmless.
 *
 * 24h expiry — long enough to finish PayPal's hosted-button round-trip
 * but short enough that a stale email doesn't haunt the next checkout
 * from a shared device.
 */
export async function saveGuestEmail(formData: FormData) {
  const rawEmail = (formData.get('email') as string | null)?.trim() ?? '';
  const plan = (formData.get('plan') as string | null) ?? 'monthly';

  const normalized = rawEmail.toLowerCase();
  if (!normalized || !/.+@.+\..+/.test(normalized)) {
    redirect(`/checkout?plan=${encodeURIComponent(plan)}&err=email`);
  }

  cookies().set(GUEST_EMAIL_COOKIE, normalized, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  });

  // Fire-and-forget recovery webhook. Wrapped to make sure a webhook
  // outage never blocks the redirect — the visitor must keep moving.
  void notifyAbandonment({
    email: normalized,
    plan: plan === 'yearly' || plan === 'monthly' ? plan : null,
    step: 'picker',
    region: 'sa',
    source: '/checkout',
  });

  redirect(`/checkout?plan=${encodeURIComponent(plan)}`);
}

/**
 * Clear the stash — used by the "تغيير" link on the picker so the
 * visitor can correct a typo without breaking out of the funnel.
 */
export async function clearGuestEmail(formData: FormData) {
  const plan = (formData.get('plan') as string | null) ?? 'monthly';
  cookies().delete(GUEST_EMAIL_COOKIE);
  redirect(`/checkout?plan=${encodeURIComponent(plan)}`);
}
