'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { PAID_COURSE_SLUGS } from '@/lib/catalog';
import { PromoCountdown } from './promo-countdown';

/**
 * Routes where the yearly-subscription offer is suppressed.
 *
 * The banner advertises "$40 for the year". On a page selling a $60
 * course or the $99 bundle that reads as a cheaper alternative to what
 * the visitor is looking at — except it isn't one, because no
 * subscription opens those courses at all. Showing both prices at once
 * doesn't just fragment attention, it actively misleads.
 *
 * Payment surfaces are suppressed for the older reason: another offer
 * on top of a payment page competes with the payment.
 */
const HIDDEN_PREFIXES = [
  '/checkout',
  '/billing',
  '/offline',
  '/purchase',
  '/ai-bundle',
  // /course/n8n, /course/ai-video, /course/vibe-coding — derived so a
  // change to the catalogue can't leave a contradicting banner behind.
  ...PAID_COURSE_SLUGS.map((slug) => `/course/${slug}`),
];

/**
 * Sitewide promo banner — the permanent $40/year offer with a live
 * countdown to the end of the current monthly cycle, so the visitor
 * sees urgency without us having to lie about limited quantity. The
 * countdown auto-refreshes at rollover, so the banner never goes stale.
 *
 * Promo figures arrive as props rather than being read here, because
 * this has to be a client component to know the current path.
 */
export function PromoBanner({
  yearlyAmount,
  yearlyAnchor,
  savingsPct,
  promoEndsAtMs,
}: {
  yearlyAmount: number;
  yearlyAnchor: number;
  savingsPct: number;
  promoEndsAtMs: number;
}) {
  const pathname = usePathname() || '';

  // Mirrors LearnerCountBar: the pathname read is deferred to after
  // mount so the server and first client pass always agree. Hiding
  // starts as `true` here rather than `false` — on a page that must
  // not show a competing price, a brief flash of "$40" is the exact
  // thing we're removing, so the banner stays out until we know.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const hidden = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!mounted || hidden) return null;

  return (
    <Link
      href={ROUTES.pricing}
      className="block sticky top-0 z-[60] bg-gradient-to-r from-emerald-500 via-emerald-600 to-brand-600 text-white text-center hover:opacity-95 transition-opacity"
    >
      <div className="container mx-auto px-3 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:text-sm font-bold">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
          خصم <span dir="ltr">{savingsPct}%</span> ·{' '}
          <span dir="ltr">${yearlyAmount}</span> بدل{' '}
          <span dir="ltr" className="line-through opacity-80">
            ${yearlyAnchor}
          </span>{' '}
          للسنة
        </span>
        <span className="opacity-70 hidden sm:inline">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="opacity-90 text-[10px] sm:text-xs font-medium">
            ينتهي خلال
          </span>
          <PromoCountdown deadlineMs={promoEndsAtMs} compact />
        </span>
      </div>
    </Link>
  );
}
