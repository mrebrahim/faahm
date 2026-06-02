'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCcw, X } from 'lucide-react';
import {
  recordManualRefund,
  recordAdHocRefund,
} from '@/app/admin/payments/[id]/actions';
import { REFUND_REASONS, REFUND_OTHER_LABEL } from '@/lib/refund-reasons';

/**
 * Refund trigger + confirm modal. Two operating modes:
 *
 *   1. paymentId is set → straight refund of that payment. The amount
 *      field is locked to the original payment amount so we can't
 *      accidentally over-refund.
 *
 *   2. paymentId is null (bulk-imported student with no payments
 *      tracked yet) → ad-hoc mode. Admin types the refund amount and
 *      we back-fill a payments row + refund row in one operation. See
 *      recordAdHocRefund() for the server side.
 *
 * Reason picked from a canonical dropdown so the revenue dashboard
 * can group refunds without normalising strings. 'أخرى…' reveals a
 * free-text input for one-offs.
 */
export function RefundButton({
  paymentId,
  amountCents,
  userId,
  studentEmail,
  variant = 'row',
}: {
  paymentId: string | null;
  amountCents: number;
  userId: string;
  studentEmail: string;
  /** 'row' = small outline button in a table; 'prominent' = action-bar pill. */
  variant?: 'row' | 'prominent';
}) {
  const isAdHoc = !paymentId;
  const [open, setOpen] = useState(false);
  const [reasonChoice, setReasonChoice] = useState<string>(REFUND_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [cancelSub, setCancelSub] = useState(true);
  // In ad-hoc mode the input drives the amount; in payment mode it's
  // locked to the original payment cents.
  const [adHocUsd, setAdHocUsd] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const computedCents = isAdHoc
    ? Math.round((Number(adHocUsd) || 0) * 100)
    : amountCents;
  const usdDisplay = (computedCents / 100).toFixed(2);

  const isOther = reasonChoice === REFUND_OTHER_LABEL;
  const finalReason = isOther ? otherReason.trim() : reasonChoice;
  const reasonOk = !isOther || otherReason.trim().length > 0;
  const amountOk = computedCents > 0;
  const canSubmit = !pending && reasonOk && amountOk;

  const submit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('amount_cents', String(computedCents));
      if (finalReason) fd.set('reason', finalReason);
      if (cancelSub) fd.set('cancel_subscription', 'on');
      try {
        if (paymentId) {
          fd.set('payment_id', paymentId);
          await recordManualRefund(fd);
        } else {
          fd.set('user_id', userId);
          await recordAdHocRefund(fd);
        }
      } catch {
        // Server action redirects — Next throws a control-flow error
        // we want to swallow, then refresh.
      }
      setOpen(false);
      router.refresh();
    });
  };

  const triggerLabel = variant === 'prominent' ? 'إلغاء الاشتراك واسترداد' : 'استرداد';

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-red-600 border-red-200 hover:bg-red-50"
      >
        <RefreshCcw className="w-4 h-4" />
        {triggerLabel}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white p-5 sm:p-6 shadow-xl rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold mb-1">
                  {isAdHoc ? 'تسجيل استرداد للطالب' : 'استرداد المبلغ بالكامل؟'}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isAdHoc ? (
                    <>
                      الطالب{' '}
                      <span dir="ltr" className="font-mono text-foreground break-all">
                        {studentEmail}
                      </span>{' '}
                      ما عندوش دفعة مسجّلة من قبل. اكتب المبلغ اللي
                      عاوز ترجّعهوله، هنسجّله كاسترداد يدوي.
                    </>
                  ) : (
                    <>
                      هتسترد{' '}
                      <span dir="ltr" className="font-mono font-bold text-foreground">
                        ${usdDisplay}
                      </span>{' '}
                      للطالب{' '}
                      <span dir="ltr" className="font-mono text-foreground break-all">
                        {studentEmail}
                      </span>
                      .
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {isAdHoc && (
                <div>
                  <label
                    htmlFor="refund-amount-usd"
                    className="text-sm font-medium block mb-1"
                  >
                    مبلغ الاسترداد (دولار)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 start-3 flex items-center text-sm text-gray-400 pointer-events-none">
                      $
                    </span>
                    <input
                      id="refund-amount-usd"
                      type="number"
                      min="0"
                      step="0.01"
                      value={adHocUsd}
                      onChange={(e) => setAdHocUsd(e.target.value)}
                      placeholder="مثلاً 5 أو 40"
                      autoFocus
                      dir="ltr"
                      className="w-full h-10 ps-7 pe-3 rounded-lg border border-gray-200 bg-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="refund-reason-select" className="text-sm font-medium block mb-1">
                  سبب الاسترداد
                </label>
                <select
                  id="refund-reason-select"
                  value={reasonChoice}
                  onChange={(e) => setReasonChoice(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {REFUND_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value={REFUND_OTHER_LABEL}>{REFUND_OTHER_LABEL}…</option>
                </select>
              </div>

              {isOther && (
                <div>
                  <label htmlFor="refund-reason-other" className="text-sm font-medium block mb-1">
                    اكتب السبب
                  </label>
                  <input
                    id="refund-reason-other"
                    type="text"
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="اكتب سبب الاسترداد بالتفصيل"
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={cancelSub}
                  onChange={(e) => setCancelSub(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span>إلغاء اشتراك الطالب فوراً</span>
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="w-full sm:w-auto"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                <RefreshCcw className="w-4 h-4" />
                {pending
                  ? 'جاري الاسترداد…'
                  : amountOk
                    ? `استرداد $${usdDisplay}`
                    : 'استرداد'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
