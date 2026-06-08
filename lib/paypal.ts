import 'server-only';
import { PAYPAL } from '@/lib/constants';

/**
 * Tiny PayPal REST client — just what we need to verify a subscription
 * after the user approves it client-side. PayPal returns the subscription
 * id to the browser; we re-fetch the canonical record from the API
 * before unlocking access so a forged subscription id can't grant a
 * free plan.
 *
 * Uses live API (api-m.paypal.com). Override via PAYPAL_API_BASE when
 * testing against sandbox.
 */
const API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';

function clientSecret(): string {
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!secret) {
    throw new Error(
      'PAYPAL_CLIENT_SECRET is not configured. Add it as an env var ' +
        'so the server can verify PayPal subscriptions before activating access.'
    );
  }
  return secret;
}

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL.clientId}:${clientSecret()}`).toString(
    'base64'
  );
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export type PayPalSubscription = {
  id: string;
  status:
    | 'APPROVAL_PENDING'
    | 'APPROVED'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'CANCELLED'
    | 'EXPIRED';
  plan_id: string;
  subscriber?: {
    email_address?: string;
    payer_id?: string;
    name?: { given_name?: string; surname?: string };
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: { amount?: { value?: string; currency_code?: string } };
  };
  start_time?: string;
  create_time?: string;
};

/**
 * Pull the live subscription record. Throws if PayPal rejects the
 * lookup — caller should treat that as 'do not activate'.
 */
export async function fetchSubscription(
  subscriptionId: string
): Promise<PayPalSubscription> {
  const token = await getAccessToken();
  const res = await fetch(
    `${API_BASE}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal subscription lookup failed (${res.status}): ${text}`);
  }
  return (await res.json()) as PayPalSubscription;
}
