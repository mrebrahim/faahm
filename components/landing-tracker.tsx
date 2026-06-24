'use client';

import { useEffect, useRef } from 'react';

/**
 * Landing-page funnel tracker. The platform-level pageview pings fire
 * automatically from <AnalyticsRouteTracker> — this component fires
 * the *named funnel events* PRD §12 wants so the merchant can see how
 * far each ad cohort gets:
 *
 *   - lp_view         once on mount  (matches the standard PageView
 *                                     but with a stable name across
 *                                     GA4 / Meta / TikTok)
 *   - pricing_viewed  fires the moment the #pricing block enters
 *                     the viewport — the most reliable 'reached the
 *                     decision step' signal we have on a single-page
 *                     funnel.
 *
 * Plan-selection + checkout-started are picked up by
 * <CheckoutTracker> on the /checkout page itself.
 *
 * Multi-platform: GA4 (gtag), Meta Pixel (fbq), TikTok Pixel (ttq).
 * Each call is guarded so a missing platform just no-ops.
 */
export function LandingTracker({
  /** Selector for the pricing section. IntersectionObserver hangs off it. */
  pricingSelector = '#pricing',
  /** Stable name used across all three platforms for the LP view. */
  viewEventName = 'lp_view',
}: {
  pricingSelector?: string;
  viewEventName?: string;
}) {
  const firedView = useRef(false);
  const firedPricing = useRef(false);

  useEffect(() => {
    if (firedView.current) return;
    firedView.current = true;

    // GA4 + Meta + TikTok all happily accept custom event names.
    // Meta + TikTok also auto-fire PageView from the base snippet,
    // so this is the *named* funnel event on top of that.
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', viewEventName, {
          page_path: window.location.pathname,
          page_title: document.title,
        });
      }
    } catch {/* gtag not loaded yet */}

    try {
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', viewEventName, {
          page_path: window.location.pathname,
        });
      }
    } catch {/* fbq missing */}

    try {
      if (window.ttq?.track) {
        window.ttq.track(viewEventName, {
          page_path: window.location.pathname,
        });
      }
    } catch {/* ttq missing */}
  }, [viewEventName]);

  // pricing_viewed: fires once when the visitor scrolls the pricing
  // section into view. Threshold 0.1 — even a sliver counts, so the
  // event fires close to the natural 'I'm thinking about it' moment.
  useEffect(() => {
    const target = document.querySelector(pricingSelector);
    if (!target) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || firedPricing.current) return;
        firedPricing.current = true;

        try {
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'pricing_viewed', {
              page_path: window.location.pathname,
            });
          }
        } catch {/* */}

        try {
          if (typeof window.fbq === 'function') {
            window.fbq('trackCustom', 'pricing_viewed', {});
          }
        } catch {/* */}

        try {
          if (window.ttq?.track) {
            window.ttq.track('pricing_viewed', {});
          }
        } catch {/* */}

        io.disconnect();
      },
      { threshold: 0.1 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [pricingSelector]);

  return null;
}
