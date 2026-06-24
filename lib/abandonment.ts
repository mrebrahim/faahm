/**
 * Cart-abandonment webhook. Whenever a visitor surrenders their email
 * to /checkout, we fire it at the n8n workflow that owns the recovery
 * sequence (1h reminder → 24h social-proof / FAQ follow-up per PRD §17).
 *
 * The webhook is fire-and-forget — we never block the visitor's
 * navigation on whether it succeeds. n8n handles dedup and figures out
 * later (via the Stripe webhook ping) whether the email actually paid
 * before deciding to send a reminder.
 *
 * Override the URL with ABANDONMENT_WEBHOOK_URL in env if the n8n
 * endpoint moves.
 */
const DEFAULT_WEBHOOK =
  'https://comp.digitalsolutionegy.com/webhook/fdbf8356-3ff6-4792-8152-5127c57e14ad';

export type AbandonmentEvent = {
  email: string;
  /** Which plan the visitor was looking at when they handed over the email. */
  plan?: 'monthly' | 'yearly' | null;
  /** Optional checkout step label — 'picker' for /checkout, etc. */
  step?: string | null;
  /** Soft routing hint for n8n — currency funnel the visitor came from. */
  region?: 'sa' | 'us' | null;
  /** Origin URL the visitor was on when they submitted. */
  source?: string | null;
};

export async function notifyAbandonment(event: AbandonmentEvent): Promise<void> {
  const url = process.env.ABANDONMENT_WEBHOOK_URL || DEFAULT_WEBHOOK;
  const payload = {
    ...event,
    sent_at: new Date().toISOString(),
  };

  try {
    // 4s timeout. n8n's first-byte latency is well under a second in
    // practice; anything over 4s means the webhook is down and we'd
    // rather drop the event than stall the visitor's redirect.
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(t);
  } catch (err) {
    // Best-effort. Log and move on — this lives in the hot path of the
    // checkout, so we never let it surface to the visitor.
    console.error('[abandonment] webhook failed', err);
  }
}
