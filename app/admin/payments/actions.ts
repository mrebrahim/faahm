'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';

/**
 * Hard-delete a payment row. SUPER-ADMIN ONLY (Ibrahim). Meant for wiping
 * payment rows that were recorded by mistake — NOT a substitute for a
 * refund (use recordManualRefund for that). Refuses to delete when any
 * refund row still points at the payment, since deleting would sever
 * that audit trail.
 *
 * The full pre-delete row is stashed on the audit log entry so we can
 * reconstruct what got wiped if it turns out to be a mistake later.
 */
export async function deletePayment(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const paymentId = String(formData.get('payment_id') || '');
  const redirectTo = String(formData.get('redirect_to') || '/admin/payments');

  if (!paymentId) {
    redirect('/admin/payments?error=' + encodeURIComponent('معرّف الدفعة مفقود.'));
  }

  await loggedAction(
    ctx,
    {
      action: 'payment.deleted',
      resourceType: 'payment',
      resourceId: paymentId,
    },
    async () => {
      const service = createServiceClient();

      const { data: payment, error: loadErr } = await service
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .maybeSingle();
      if (loadErr || !payment) {
        throw new Error(loadErr?.message || 'الدفعة مش موجودة.');
      }

      const { count: refundCount } = await service
        .from('refunds')
        .select('id', { count: 'exact', head: true })
        .eq('payment_id', paymentId);
      if ((refundCount ?? 0) > 0) {
        throw new Error(
          'الدفعة دي عليها استرداد مسجّل — امسح الاسترداد الأول قبل ما تحذف الدفعة.'
        );
      }

      await service.from('payment_notes').delete().eq('payment_id', paymentId);

      const { error: delErr } = await service
        .from('payments')
        .delete()
        .eq('id', paymentId);
      if (delErr) throw new Error(delErr.message);
    }
  ).catch((err) => {
    const msg = err instanceof Error ? err.message : 'فشل حذف الدفعة';
    redirect(
      redirectTo.startsWith('/admin/payments/')
        ? `${redirectTo}?error=${encodeURIComponent(msg)}`
        : `/admin/payments?error=${encodeURIComponent(msg)}`
    );
  });

  revalidatePath('/admin/payments');
  revalidatePath('/admin/revenue');
  redirect('/admin/payments?success=payment_deleted');
}
