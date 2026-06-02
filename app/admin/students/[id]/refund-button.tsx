'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCcw, X } from 'lucide-react';
import { recordManualRefund } from '@/app/admin/payments/[id]/actions';

/**
 * One-click refund button used inline next to a paid payment row on a
 * student's profile. Opens a small confirm modal pre-filled with the
 * original payment amount (since the admin already recorded what was
 * paid, no manual entry needed). Defaults to also cancelling the
 * linked subscription so the student loses access in the same action.
 */
export function RefundButton({
  paymentId,
  amountCents,
  studentEmail,
}: {
  paymentId: string;
  amountCents: number;
  studentEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelSub, setCancelSub] = useState(true);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const usd = (amountCents / 100).toFixed(2);

  const submit = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('payment_id', paymentId);
      fd.set('amount_cents', String(amountCents));
      if (reason) fd.set('reason', reason);
      if (cancelSub) fd.set('cancel_subscription', 'on');
      try {
        await recordManualRefund(fd);
      } catch {
        // recordManualRefund redirects, which Next throws as a control-flow
        // error in a transition — treat as success and let the router
        // pick up the new URL.
      }
      setOpen(false);
      router.refresh();
    });
  };

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
        استرداد
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
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-bold mb-1">
                  استرداد المبلغ بالكامل؟
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  هتسترد{' '}
                  <span dir="ltr" className="font-mono font-bold text-foreground">
                    ${usd}
                  </span>{' '}
                  للطالب{' '}
                  <span dir="ltr" className="font-mono text-foreground">
                    {studentEmail}
                  </span>
                  . الإجراء ده هيظهر في لوحة الإيرادات كاسترداد.
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
              <div>
                <label htmlFor="refund-reason" className="text-sm font-medium block mb-1">
                  سبب الاسترداد (اختياري)
                </label>
                <input
                  id="refund-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: ضمان الـ 7 أيام"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cancelSub}
                  onChange={(e) => setCancelSub(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span>إلغاء الاشتراك المرتبط بالدفعة دي فوراً</span>
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
                disabled={pending}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                <RefreshCcw className="w-4 h-4" />
                {pending ? 'جاري الاسترداد…' : `استرداد $${usd}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
