'use client';

import { useEffect, useState } from 'react';
import { Award, X } from 'lucide-react';

/**
 * Inline 'شهادة إتمام' chip + popover. F.3 from the follow-up PRD —
 * Clarity recorded dead clicks on the certificate bullet because
 * visitors wanted to know what kind of certificate it is. The
 * popover delivers an honest answer (CV + LinkedIn, no fake
 * accreditation claim) in two short sentences.
 *
 * Two pieces:
 *   - <CertificateBullet />: the click target — looks like the rest
 *     of the feature bullets but has an info dot to hint at click-
 *     ability.
 *   - On click, shows a small centered popover. Closes on the X,
 *     on backdrop click, or on Escape.
 */
export function CertificateBullet({
  text = 'شهادة إتمام لكل كورس',
  variant = 'feat',
}: {
  text?: string;
  /** 'feat' renders inside the green-check feature lists; 'plain'
   *  renders a standalone underlined link. */
  variant?: 'feat' | 'plain';
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    // Block body scroll while modal open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const trigger =
    variant === 'feat' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-start gap-2.5 text-sm text-start w-full hover:text-brand-700 transition-colors"
      >
        <span className="w-4 h-4 mt-0.5 flex-shrink-0 rounded-full bg-brand-500 text-white inline-flex items-center justify-center text-[10px] font-bold">
          ✓
        </span>
        <span className="text-gray-800 group-hover:text-brand-700 underline decoration-dotted decoration-gray-400 group-hover:decoration-brand-500 underline-offset-4">
          {text}
        </span>
        <span
          aria-hidden
          className="text-[10px] font-bold text-brand-600 bg-brand-500/10 rounded-full w-4 h-4 inline-flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-brand-500 group-hover:text-white transition-colors"
        >
          i
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium underline decoration-dotted underline-offset-4"
      >
        <Award className="w-3.5 h-3.5" />
        {text}
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="certificate-info-title"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-[ci-in_0.2s_ease-out_both]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
              className="absolute top-2 start-2 w-9 h-9 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 inline-flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center mb-4 shadow-md">
              <Award className="w-7 h-7" />
            </div>
            <h3
              id="certificate-info-title"
              className="font-display text-lg font-extrabold mb-2"
            >
              شهادة إتمام من منصة فاهم
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              بعد ما تخلّص أي كورس، بتاخد شهادة إتمام باسمك من منصة فاهم.
              تقدر تضيفها لسيرتك الذاتية (CV) وملفك على LinkedIn.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full inline-flex items-center justify-center min-h-[44px] rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors"
            >
              تمام
            </button>
          </div>
          <style>{`
            @keyframes ci-in {
              from { transform: translateY(8px); opacity: 0; }
              to   { transform: translateY(0);    opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
