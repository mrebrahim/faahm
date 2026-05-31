'use client';

import { useEffect, useRef } from 'react';

type Props = {
  eventId: string;
  value: number;
  currency: string;
  contentName: string;
  contentIds?: string[];
};

declare global {
  interface Window {
    __purchaseTracked?: Record<string, boolean>;
  }
}

/**
 * Fires a Purchase event to GA4, Meta Pixel, and TikTok Pixel client-side.
 * Pairs with the server-side trackServerEvent call in the success page —
 * both use the same `eventId` so Meta/TikTok deduplicate them.
 *
 * Guarded against double-firing within the same page session (React strict
 * mode, fast refresh) via a per-eventId flag on `window`.
 */
export function PurchaseTracker({ eventId, value, currency, contentName, contentIds = [] }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (typeof window === 'undefined') return;
    window.__purchaseTracked = window.__purchaseTracked || {};
    if (window.__purchaseTracked[eventId]) return;
    window.__purchaseTracked[eventId] = true;
    fired.current = true;

    // GA4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'purchase', {
        transaction_id: eventId,
        value,
        currency,
        items: contentIds.length
          ? contentIds.map((id) => ({ item_id: id, item_name: contentName }))
          : [{ item_id: contentName, item_name: contentName }],
      });
    }

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq(
        'track',
        'Purchase',
        {
          value,
          currency,
          content_name: contentName,
          content_ids: contentIds.length ? contentIds : [contentName],
          content_type: 'product',
        },
        { eventID: eventId }
      );
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('CompletePayment', {
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
  }, [eventId, value, currency, contentName, contentIds]);

  return null;
}
