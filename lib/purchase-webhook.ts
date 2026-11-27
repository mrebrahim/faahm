/**
 * Course purchases → n8n → GA4 `purchase`.
 *
 * The GA4 Measurement Protocol secret lives in n8n (as a credential),
 * not in the site's env, so the site never holds it. We post a small,
 * already-shaped purchase payload to an n8n webhook and the workflow
 * forwards it to GA4.
 *
 *   N8N_PURCHASE_WEBHOOK_URL   — the n8n webhook (unset = feature off)
 *   N8N_PURCHASE_WEBHOOK_TOKEN — optional shared token, sent as
 *                                `x-faahm-token` so the webhook can
 *                                reject anything that isn't us.
 *
 * Never throws and never blocks fulfilment: analytics must not be able
 * to fail a payment the buyer actually made.
 */

export type PurchaseEventPayload = {
  transaction_id: string;
  value: number;
  currency: string;
  /** From the buyer's `_ga` cookie when we caught it at checkout. */
  client_id?: string | null;
  user_id?: string | null;
  coupon?: string | null;
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }>;
};

/**
 * `_ga` looks like `GA1.1.1234567890.1700000000`; GA4 wants the last
 * two segments as the client id. Anything else is ignored.
 */
export function clientIdFromGaCookie(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length < 4) return null;
  const id = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  return /^\d+\.\d+$/.test(id) ? id : null;
}

export async function sendPurchaseToN8n(payload: PurchaseEventPayload): Promise<boolean> {
  const url = process.env.N8N_PURCHASE_WEBHOOK_URL;
  if (!url) return false;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = process.env.N8N_PURCHASE_WEBHOOK_TOKEN;
  if (token) headers['x-faahm-token'] = token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ event: 'purchase', ...payload }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[purchase-webhook] n8n answered ${res.status} for ${payload.transaction_id}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(
      '[purchase-webhook] send failed',
      payload.transaction_id,
      err instanceof Error ? err.message : err
    );
    return false;
  } finally {
    clearTimeout(timer);
  }
}
