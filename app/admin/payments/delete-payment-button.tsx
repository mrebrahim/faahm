'use client';

import { Trash2 } from 'lucide-react';
import { deletePayment } from './actions';

/**
 * Destructive button that hard-deletes a payment row. Rendered only for
 * super-admins by the caller (server checks the role again, but hiding
 * the button in-DOM keeps normal admins from even seeing it). Uses a
 * native confirm() so misclicks are caught without any modal machinery.
 */
export function DeletePaymentButton({
  paymentId,
  redirectTo,
  size = 'icon',
  label,
}: {
  paymentId: string;
  redirectTo?: string;
  size?: 'icon' | 'lg';
  label?: string;
}) {
  return (
    <form
      action={deletePayment}
      onSubmit={(e) => {
        const msg =
          'حذف الدفعة نهائي ومش هيرجع تاني. لو الدفعة اتسجّلت غلط استكمل، لو محتاج ترجّع الفلوس للعميل استخدم "تسجيل استرداد" بدل ما تمسح. تأكيد؟';
        if (!window.confirm(msg)) {
          e.preventDefault();
        }
      }}
      className="inline-block"
    >
      <input type="hidden" name="payment_id" value={paymentId} />
      {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}
      {size === 'icon' ? (
        <button
          type="submit"
          title="حذف الدفعة (سوبر أدمن)"
          aria-label="حذف الدفعة"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-rose-500 hover:text-white hover:bg-rose-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          {label || 'حذف الدفعة نهائياً'}
        </button>
      )}
    </form>
  );
}
