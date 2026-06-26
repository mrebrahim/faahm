/**
 * Client → server tracking bridge. Fires a non-blocking POST to
 * /api/track/event so the same conversion lands at Meta CAPI +
 * TikTok Events API server-side, with the SAME event_id we passed
 * to fbq() / ttq() client-side. The ad networks dedupe on event_id
 * and we recover the iOS / ad-blocker traffic the client pixels lose.
 *
 * Uses navigator.sendBeacon when available so the POST survives
 * page unloads (the usual moment lp_view + InitiateCheckout fire on
 * a single-tap visitor). Falls back to fetch(keepalive).
 *
 * Generates a stable per-session id if the caller doesn't pass one
 * so dedup works even for events like lp_view that don't have a
 * natural transaction id.
 */
export type ServerEventPayload = {
  eventName: 'lp_view' | 'pricing_viewed' | 'InitiateCheckout' | 'ViewContent' | 'Lead' | 'AddToCart';
  eventId: string;
  sourceUrl?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
};

export function postServerEvent(payload: ServerEventPayload): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({
    ...payload,
    sourceUrl: payload.sourceUrl ?? window.location.href,
  });

  // sendBeacon: ~64KB cap (we're nowhere close), guaranteed delivery
  // even if the user navigates away mid-fire. The browser queues it
  // and finishes the POST after the page is gone.
  try {
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(
        '/api/track/event',
        new Blob([body], { type: 'application/json' })
      );
      if (ok) return;
    }
  } catch {
    /* fall through to fetch */
  }

  // Fallback for older Safari / privacy modes that disable sendBeacon.
  // keepalive=true asks the browser to finish the request after
  // navigation; capped at ~64KB which is fine here.
  try {
    fetch('/api/track/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* swallow — we don't want tracking failures to surface */
    });
  } catch {
    /* nothing else we can do */
  }
}

/**
 * Returns a stable id for the current browser tab/session. Used by
 * lp_view + pricing_viewed where there's no natural transaction
 * boundary — same value across the client pixel + the server CAPI
 * call so Meta dedupes them.
 */
export function getSessionEventId(eventName: string): string {
  if (typeof window === 'undefined') {
    return `${eventName}-srv-${Date.now()}`;
  }
  try {
    const key = `faahm_evt_${eventName}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = `${eventName}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    // Private mode etc. — best-effort id, dedup will be partial.
    return `${eventName}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }
}
