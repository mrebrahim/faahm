'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { X, Sparkles, ArrowLeft } from 'lucide-react';
import { PromoCountdown } from './promo-countdown';

/**
 * Routes where the popup is suppressed even though the promo is active.
 * The visitor is already inside a conversion flow — throwing another
 * offer card on top of a payment page fragments attention and hurts
 * conversion instead of helping it.
 */
const HIDDEN_PREFIXES = [
  '/pricing',
  '/checkout',
  '/billing',
  '/offline',
  '/personal-plan',
  '/ai-bundle',
];

/**
 * One-time-per-cycle popup that surfaces the $40 offer + a live countdown
 * to the end of the current monthly cycle. Persistence key is scoped to
 * the ISO date of the promo end, so every time the cycle rolls over (past
 * the 20th → next month's 20th) the popup re-fires for repeat visitors
 * automatically — no manual reset needed.
 */
export function PromoPopup({
  yearlyAmount,
  yearlyAnchor,
  savingsPct,
  promoEndsAtMs,
}: {
  yearlyAmount: number;
  yearlyAnchor: number;
  savingsPct: number;
  /** ms since epoch — end of the current promo cycle. Doubles as the key
   *  we keep in sessionStorage so a rollover automatically re-shows the popup. */
  promoEndsAtMs: number;
}) {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const suppressed = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (suppressed) return;
    const key = `faahm_promo_seen_${promoEndsAtMs}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* fall through — worst case popup shows once per page load */
    }
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [promoEndsAtMs, suppressed]);

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem(`faahm_promo_seen_${promoEndsAtMs}`, '1');
    } catch {
      /* best effort */
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="faahm-promo-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="إغلاق"
        onClick={dismiss}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-[pp-in_0.35s_cubic-bezier(0.4,0,0.2,1)_both]">
        <button
          type="button"
          onClick={dismiss}
          aria-label="إغلاق الإعلان"
          className="absolute top-3 start-3 w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10 inline-flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-brand-600 text-white text-center py-8 px-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            عرض لفترة محدودة
          </div>
          <h2
            id="faahm-promo-title"
            className="font-display text-2xl sm:text-3xl font-extrabold leading-tight mb-2"
          >
            اشترك بـ <span dir="ltr">${yearlyAmount}</span> للسنة كاملة
          </h2>
          <div className="flex items-baseline justify-center gap-2 mb-3">
            <span dir="ltr" className="text-sm line-through opacity-80">
              ${yearlyAnchor}
            </span>
            <span dir="ltr" className="font-display text-4xl font-extrabold">
              ${yearlyAmount}
            </span>
            <span className="text-xs opacity-90">/سنة</span>
          </div>
          <p className="text-sm opacity-95 mb-4">
            <strong>خصم <span dir="ltr">{savingsPct}%</span></strong> — العرض ينتهي خلال:
          </p>
          <PromoCountdown deadlineMs={promoEndsAtMs} />
        </div>

        <div className="p-6 text-center">
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            بعد ما ينتهي العدّاد، السعر يرجع للعادي. ثبّت اشتراكك بسعر السنة كاملة دلوقتي.
          </p>
          <Link
            href="/pricing"
            onClick={dismiss}
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 transition-colors"
          >
            اشترك بـ <span dir="ltr">${yearlyAmount}</span> دلوقتي
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
          >
            أشوف بعدين
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pp-in {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
