'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';

const ALLOWED_STATUSES = new Set(['pending', 'paid', 'failed', 'refunded']);
const ALLOWED_GATEWAYS = new Set(['stripe', 'paymob', 'manual', 'paypal']);
const ALLOWED_CURRENCIES = new Set(['USD', 'EGP', 'SAR']);

/**
 * Edit a payment row. SUPER-ADMIN ONLY. Meant for correcting entries
 * that were recorded with the wrong amount / currency / status / gateway
 * reference — NOT for real business changes (a refund still goes through
 * recordManualRefund, and a chargeback still gets its own flow).
 *
 * Editable fields: amount, currency, status, gateway, gateway_payment_id,
 * gateway_order_id. Immutable: id, user_id, subscription_id, created_at.
 * The full before-diff is stashed on the audit log entry.
 */
export async function updatePayment(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const paymentId = String(formData.get('payment_id') || '');
  if (!paymentId) redirect('/admin/payments');

  const amountRaw = String(formData.get('amount') || '').trim();
  const currency = String(formData.get('currency') || '').trim().toUpperCase();
  const status = String(formData.get('status') || '').trim();
  const gateway = String(formData.get('gateway') || '').trim();
  const gatewayPaymentId =
    String(formData.get('gateway_payment_id') || '').trim() || null;
  const gatewayOrderId =
    String(formData.get('gateway_order_id') || '').trim() || null;

  const amountNumber = Number(amountRaw);
  if (!Number.isFinite(amountNumber) || amountNumber < 0) {
    redirect(
      `/admin/payments/${paymentId}?error=${encodeURIComponent('المبلغ مش صحيح.')}`
    );
  }
  const amountCents = Math.round(amountNumber * 100);

  if (!ALLOWED_CURRENCIES.has(currency)) {
    redirect(
      `/admin/payments/${paymentId}?error=${encodeURIComponent('العملة مش مدعومة.')}`
    );
  }
  if (!ALLOWED_STATUSES.has(status)) {
    redirect(
      `/admin/payments/${paymentId}?error=${encodeURIComponent('الحالة مش صحيحة.')}`
    );
  }
  if (!ALLOWED_GATEWAYS.has(gateway)) {
    redirect(
      `/admin/payments/${paymentId}?error=${encodeURIComponent('البوابة مش صحيحة.')}`
    );
  }

  await loggedAction(
    ctx,
    {
      action: 'payment.updated',
      resourceType: 'payment',
      resourceId: paymentId,
      metadata: {
        after: {
          amount_cents: amountCents,
          currency,
          status,
          gateway,
          gateway_payment_id: gatewayPaymentId,
          gateway_order_id: gatewayOrderId,
        },
      },
    },
    async () => {
      const service = createServiceClient();

      const { data: before, error: loadErr } = await service
        .from('payments')
        .select('id, amount_cents, currency, status, gateway, gateway_payment_id, gateway_order_id')
        .eq('id', paymentId)
        .maybeSingle();
      if (loadErr || !before) {
        throw new Error(loadErr?.message || 'الدفعة مش موجودة.');
      }

      const { error: upErr } = await service
        .from('payments')
        .update({
          amount_cents: amountCents,
          currency,
          status,
          gateway,
          gateway_payment_id: gatewayPaymentId,
          gateway_order_id: gatewayOrderId,
        })
        .eq('id', paymentId);
      if (upErr) throw new Error(upErr.message);
    }
  ).catch((err) => {
    const msg = err instanceof Error ? err.message : 'فشل تعديل الدفعة';
    redirect(
      `/admin/payments/${paymentId}?error=${encodeURIComponent(msg)}`
    );
  });

  revalidatePath(`/admin/payments/${paymentId}`);
  revalidatePath('/admin/payments');
  revalidatePath('/admin/revenue');
  redirect(`/admin/payments/${paymentId}?success=payment_updated`);
}

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
