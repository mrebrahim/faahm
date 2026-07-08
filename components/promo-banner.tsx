import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { getPromoState } from '@/lib/promo';
import { ROUTES } from '@/lib/constants';

/**
 * Site-wide promo banner. Rendered inside the root layout so it appears
 * on every page during the day-6-to-day-20 promo window. Sits ABOVE
 * every sticky header (z-index high enough) so the visitor sees it
 * even after scrolling. Server component — no client JS shipped.
 */
export function PromoBanner() {
  const promo = getPromoState();
  if (!promo.active) return null;

  return (
    <Link
      href={ROUTES.pricing}
      className="block sticky top-0 z-[60] bg-gradient-to-r from-emerald-500 via-emerald-600 to-brand-600 text-white text-center hover:opacity-95 transition-opacity"
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold">
        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
        <span>
          خصم <span dir="ltr">{promo.savingsPct}%</span> ·{' '}
          <span dir="ltr">${promo.yearlyAmount}</span> بدل{' '}
          <span dir="ltr" className="line-through opacity-80">
            ${promo.yearlyAnchor}
          </span>{' '}
          للسنة كاملة — لفترة محدودة
        </span>
      </div>
    </Link>
  );
}
