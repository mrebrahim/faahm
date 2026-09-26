'use client';

import { useEffect, useRef } from 'react';
import { postServerEvent, getSessionEventId } from '@/lib/client-tracking';

/**
 * Landing-page instrumentation.
 *
 * Launching without this means arguing from feeling in two weeks, so
 * it ships with the page rather than after it.
 *
 * Four events, each answering one question:
 *   lp_view        — did they arrive, and from where
 *   scroll_pricing — did they get as far as the price
 *   cta_click      — which button, of the four identical ones
 *   faq_open       — which objection is actually theirs
 *
 * `faq_open` earns its place: an objection opened far more than the
 * others belongs at the top of the page, not buried in the FAQ.
 *
 * CTA and FAQ tracking use event delegation on `data-track-*`
 * attributes so the server-rendered page stays static — no per-button
 * client component, no hydration cost on a page whose whole job is to
 * paint fast on 4G.
 */
export function AiLabTracker({ variant = 'default' }: { variant?: string }) {
  const firedView = useRef(false);
  const firedPricing = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const gtag = (window as any).gtag as undefined | ((...a: any[]) => void);
    const source = new URLSearchParams(window.location.search).get('utm_source') ?? 'direct';

    if (!firedView.current) {
      firedView.current = true;
      gtag?.('event', 'lp_view', { variant, source });
      // Mirrored to Meta CAPI with a stable id so the pixel and the
      // server event dedupe instead of double-counting.
      postServerEvent({
        eventName: 'lp_view',
        eventId: getSessionEventId('lp_view_ai_lab'),
        contentName: 'ai-lab-landing',
      });
    }

    // Price section reached.
    const pricing = document.getElementById('pricing');
    let io: IntersectionObserver | null = null;
    if (pricing && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting && !firedPricing.current) {
              firedPricing.current = true;
              gtag?.('event', 'scroll_pricing', { variant });
              postServerEvent({
                eventName: 'pricing_viewed',
                eventId: getSessionEventId('pricing_ai_lab'),
                contentName: 'ai-lab-landing',
              });
              io?.disconnect();
            }
          }
        },
        { threshold: 0.3 }
      );
      io.observe(pricing);
    }

    // Delegated clicks: CTAs and FAQ toggles.
    const onClick = (ev: MouseEvent) => {
      const el = (ev.target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-track-cta], [data-track-faq]'
      );
      if (!el) return;

      const cta = el.dataset.trackCta;
      if (cta) {
        gtag?.('event', 'cta_click', { position: cta, variant });
        return;
      }

      const faq = el.dataset.trackFaq;
      // A <details> reports the state it is LEAVING, so only count the
      // open. Counting both would double every number.
      if (faq && !(el.closest('details') as HTMLDetailsElement | null)?.open) {
        gtag?.('event', 'faq_open', { question: faq, variant });
      }
    };

    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      io?.disconnect();
    };
  }, [variant]);

  return null;
}
