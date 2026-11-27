'use client';

import { useEffect, useRef } from 'react';
import { postServerEvent, getSessionEventId } from '@/lib/client-tracking';

type Props = {
  contentName: string;
  contentIds: string[];
  value?: number;
  currency?: string;
};

/**
 * ViewContent (Meta / TikTok) + view_item (GA4) once per product page
 * view. Mounted on the course detail pages and the AI Bundle landing so
 * the ad networks see the product-interest step between PageView and
 * InitiateCheckout. Same event_id on the client pixels and the
 * server-side CAPI mirror so the networks dedupe.
 */
export function ViewContentTracker({
  contentName,
  contentIds,
  value,
  currency = 'USD',
}: Props) {
  const fired = useRef(false);
  const idsKey = contentIds.join(',');

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const eventId = getSessionEventId(`ViewContent_${idsKey}`);
    const hasValue = typeof value === 'number' && value > 0;

    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'view_item', {
          ...(hasValue ? { value, currency } : {}),
          items: contentIds.map((id) => ({ item_id: id, item_name: contentName })),
        });
      }
    } catch {/* gtag not loaded */}

    try {
      if (typeof window.fbq === 'function') {
        window.fbq(
          'track',
          'ViewContent',
          {
            content_name: contentName,
            content_ids: contentIds,
            content_type: 'product',
            ...(hasValue ? { value, currency } : {}),
          },
          { eventID: eventId }
        );
      }
    } catch {/* fbq missing */}

    try {
      if (window.ttq?.track) {
        window.ttq.track('ViewContent', {
          content_name: contentName,
          content_id: contentIds[0],
          ...(hasValue ? { value, currency } : {}),
          event_id: eventId,
        });
      }
    } catch {/* ttq missing */}

    postServerEvent({
      eventName: 'ViewContent',
      eventId,
      contentName,
      contentIds,
      ...(hasValue ? { value, currency } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, contentName, value, currency]);

  return null;
}
