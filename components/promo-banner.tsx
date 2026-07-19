import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getPromoState } from '@/lib/promo';
import { ROUTES } from '@/lib/constants';
import { PromoCountdown } from './promo-countdown';

/**
 * Sitewide promo banner — always visible now that the yearly plan is a
 * permanent $40. Includes a live countdown to the end of the current
 * monthly cycle so the visitor sees urgency without us having to lie
 * about a limited quantity. The countdown auto-refreshes at rollover,
 * so the banner never goes stale.
 */
export function PromoBanner() {
  const promo = getPromoState();

  return (
    <Link
      href={ROUTES.pricing}
      className="block sticky top-0 z-[60] bg-gradient-to-r from-emerald-500 via-emerald-600 to-brand-600 text-white text-center hover:opacity-95 transition-opacity"
    >
      <div className="container mx-auto px-3 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:text-sm font-bold">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
          خصم <span dir="ltr">{promo.savingsPct}%</span> ·{' '}
          <span dir="ltr">${promo.yearlyAmount}</span> بدل{' '}
          <span dir="ltr" className="line-through opacity-80">
            ${promo.yearlyAnchor}
          </span>{' '}
          للسنة
        </span>
        <span className="opacity-70 hidden sm:inline">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="opacity-90 text-[10px] sm:text-xs font-medium">
            ينتهي خلال
          </span>
          <PromoCountdown deadlineMs={promo.promoEndsAtMs} compact />
        </span>
      </div>
    </Link>
  );
}
