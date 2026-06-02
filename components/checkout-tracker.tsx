'use client';

import { useEffect, useRef } from 'react';

type Props = {
  eventId: string;
  value: number;
  currency: string;
  contentName: string;
  contentIds?: string[];
  /**
   * Funnel step label so ad networks can tell apart the picker page
   * (/checkout) from the offline payment instruction pages (/offline/*).
   * Mapped onto custom-data so the same Pixel can split conversions
   * by where the drop-off happens.
   */
  step?: 'picker' | 'instapay' | 'vodafone';
};

declare global {
  interface Window {
    __checkoutTracked?: Record<string, boolean>;
  }
}

/**
 * Fires InitiateCheckout (Meta / TikTok) + begin_checkout (GA4) when the
 * student lands on /checkout or any /offline payment page. Same eventId
 * across pixels so Meta/TikTok dedupe and we can tie the event to the
 * eventual Purchase via shared content_ids.
 *
 * Guarded against re-firing inside the same SPA session via a
 * window-scoped flag — Next's client-side nav would otherwise emit
 * InitiateCheckout twice when the user switches between offline tabs.
 */
export function CheckoutTracker({
  eventId,
  value,
  currency,
  contentName,
  contentIds = [],
  step = 'picker',
}: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (typeof window === 'undefined') return;
    window.__checkoutTracked = window.__checkoutTracked || {};
    if (window.__checkoutTracked[eventId]) return;
    window.__checkoutTracked[eventId] = true;
    fired.current = true;

    // GA4 — begin_checkout follows the recommended-events schema.
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'begin_checkout', {
        transaction_id: eventId,
        value,
        currency,
        checkout_step: step,
        items: contentIds.length
          ? contentIds.map((id) => ({ item_id: id, item_name: contentName }))
          : [{ item_id: contentName, item_name: contentName }],
      });
    }

    // Meta Pixel — InitiateCheckout. eventID enables CAPI dedupe.
    if (typeof window.fbq === 'function') {
      window.fbq(
        'track',
        'InitiateCheckout',
        {
          value,
          currency,
          content_name: contentName,
          content_ids: contentIds.length ? contentIds : [contentName],
          content_type: 'product',
          num_items: 1,
          checkout_step: step,
        },
        { eventID: eventId }
      );
    }

    // TikTok Pixel — InitiateCheckout is one of their standard events.
    if (window.ttq?.track) {
      window.ttq.track('InitiateCheckout', {
        value,
        currency,
        content_name: contentName,
        content_id: contentIds[0] ?? contentName,
        contents: contentIds.length
          ? contentIds.map((id) => ({ content_id: id, content_name: contentName }))
          : [{ content_id: contentName, content_name: contentName }],
        event_id: eventId,
      });
    }
  }, [eventId, value, currency, contentName, contentIds, step]);

  return null;
}
