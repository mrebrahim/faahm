'use client';

import { useEffect } from 'react';
import { postServerEvent } from '@/lib/client-tracking';
import { productById } from '@/lib/catalog';

/**
 * Fires InitiateCheckout (Meta / TikTok) + begin_checkout (GA4) the
 * moment a visitor taps ANY Stripe buy button on faahm — i.e. any link
 * into /api/checkout/* (built by checkoutHrefFor in lib/catalog.ts).
 *
 * One delegated listener in the root layout instead of wrapping every
 * button: new CTAs are covered automatically. The tap navigates away
 * to Stripe immediately, so the server-side mirror (sendBeacon) is the
 * copy that reliably lands; the client pixels are best-effort.
 */
export function StripeCheckoutClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const link = target?.closest?.('a[href*="/api/checkout/"]') as HTMLAnchorElement | null;
      if (!link) return;

      let productId: string | null = null;
      try {
        productId = new URL(link.href, window.location.origin).searchParams.get('product');
      } catch {/* malformed href */}

      const product = productById(productId);
      const contentName = product?.titleAr ?? productId ?? 'checkout';
      const contentIds = [product?.id ?? productId ?? 'unknown'];
      const value = product?.priceUsd ?? 0;
      const currency = 'USD';
      const eventId = `InitiateCheckout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      try {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'begin_checkout', {
            value,
            currency,
            checkout_step: 'stripe',
            items: contentIds.map((id) => ({ item_id: id, item_name: contentName })),
          });
        }
      } catch {/* */}

      try {
        if (typeof window.fbq === 'function') {
          window.fbq(
            'track',
            'InitiateCheckout',
            {
              value,
              currency,
              content_name: contentName,
              content_ids: contentIds,
              content_type: 'product',
              num_items: 1,
              checkout_step: 'stripe',
            },
            { eventID: eventId }
          );
        }
      } catch {/* */}

      try {
        if (window.ttq?.track) {
          window.ttq.track('InitiateCheckout', {
            value,
            currency,
            content_name: contentName,
            content_id: contentIds[0],
            event_id: eventId,
          });
        }
      } catch {/* */}

      postServerEvent({
        eventName: 'InitiateCheckout',
        eventId,
        value,
        currency,
        contentName,
        contentIds,
      });
    }

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
