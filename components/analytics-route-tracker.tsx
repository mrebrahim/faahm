'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      page: () => void;
      track: (event: string, data?: unknown) => void;
      load: (id: string) => void;
    };
    __purchaseTracked?: Record<string, boolean>;
  }
}

/**
 * Re-fire PageView on App Router navigations. The initial snippets
 * (GA4 / Meta / TikTok) only see the first URL because Next.js doesn't
 * full-reload between routes — this hook emits a fresh pageview to
 * each platform that's actually loaded.
 *
 * Wrapped in <Suspense> so useSearchParams doesn't force the whole
 * layout into client rendering when the URL has no query string.
 */
function Tracker({ hasGa, hasFb, hasTt }: { hasGa: boolean; hasFb: boolean; hasTt: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams?.toString();
    const url = pathname + (qs ? `?${qs}` : '');

    if (hasGa && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
    if (hasFb && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
    if (hasTt && window.ttq?.page) {
      window.ttq.page();
    }
  }, [pathname, searchParams, hasGa, hasFb, hasTt]);

  return null;
}

export function AnalyticsRouteTracker(props: { hasGa: boolean; hasFb: boolean; hasTt: boolean }) {
  return (
    <Suspense fallback={null}>
      <Tracker {...props} />
    </Suspense>
  );
}
