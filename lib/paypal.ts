import 'server-only';

/**
 * Tiny PayPal REST client — only what we need to verify a Subscription
 * came back from PayPal looking like the visitor actually approved
 * + paid. Lives in /lib so both the activation server action and a
 * future webhook handler can share one client.
 *
 * The client ID is public (it ships in the SDK URL). The matching
 * `PAYPAL_CLIENT_SECRET` is required server-side for the OAuth
 * client_credentials grant.
 */
const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';

const CLIENT_ID =
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
  'Aa2JYhQE0BrpujlmTjeAnBOj8ZbbaV43lwMgJWpE-nAg0X2wED_nUCoLJvK-sP-wn1I-ewF6F-_FRZ3s';

function clientSecret(): string {
  const s = process.env.PAYPAL_CLIENT_SECRET;
  if (!s) {
    throw new Error(
      'Missing PAYPAL_CLIENT_SECRET env var — required to verify PayPal subscriptions.'
    );
  }
  return s;
}

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${CLIENT_ID}:${clientSecret()}`).toString('base64');
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`PayPal token request failed: ${res.status}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error('PayPal token response missing access_token');
  }
  return json.access_token;
}

export type PayPalSubscription = {
  id: string;
  status: string;
  plan_id: string;
  subscriber?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  billing_info?: {
    next_billing_time?: string;
  };
};

export async function fetchSubscription(id: string): Promise<PayPalSubscription> {
  const token = await getAccessToken();
  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${encodeURIComponent(id)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  );
  if (!res.ok) {
    throw new Error(`PayPal subscription lookup failed: ${res.status}`);
  }
  return (await res.json()) as PayPalSubscription;
}
