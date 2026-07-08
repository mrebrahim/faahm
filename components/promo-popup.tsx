'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Sparkles, ArrowLeft } from 'lucide-react';

/**
 * One-time-per-promo-window popup that announces the price drop to
 * anyone who lands on the site during the day-6-to-day-20 window.
 * Persistence: a sessionStorage flag scoped to the current promo month
 * so the visitor sees it once per session but gets re-shown if a NEW
 * promo cycle starts. Rendered from the root layout (via a server
 * gate on getPromoState().deepActive) so it appears everywhere.
 */
export function PromoPopup({
  yearlyAmount,
  yearlyAnchor,
  savingsPct,
  promoMonth,
}: {
  yearlyAmount: number;
  yearlyAnchor: number;
  savingsPct: number;
  /** YYYY-MM in Africa/Cairo — key so a new month re-shows the popup. */
  promoMonth: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `faahm_promo_seen_${promoMonth}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // sessionStorage disabled — still show once per page load.
    }
    // Small delay so the popup doesn't blast the visitor before the
    // page paints. 1.5s is enough for the hero to register first.
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [promoMonth]);

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem(`faahm_promo_seen_${promoMonth}`, '1');
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
      {/* Backdrop */}
      <button
        type="button"
        aria-label="إغلاق"
        onClick={dismiss}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
      />
      {/* Card */}
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
            عرض محدود
          </div>
          <h2
            id="faahm-promo-title"
            className="font-display text-2xl sm:text-3xl font-extrabold leading-tight mb-2"
          >
            تم تحديث السعر
          </h2>
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span dir="ltr" className="font-display text-5xl font-extrabold">
              ${yearlyAmount}
            </span>
            <span className="text-sm opacity-90">/سنة</span>
          </div>
          <p className="text-sm opacity-95">
            بدل{' '}
            <span dir="ltr" className="line-through">
              ${yearlyAnchor}
            </span>{' '}
            — <strong>خصم <span dir="ltr">{savingsPct}%</span></strong> لفترة محدودة
          </p>
        </div>

        <div className="p-6 text-center">
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            العرض متاح من يوم <span dir="ltr">6</span> لغاية يوم{' '}
            <span dir="ltr">20</span> من كل شهر. اشترك دلوقتي وثبّت السعر لسنة كاملة.
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
