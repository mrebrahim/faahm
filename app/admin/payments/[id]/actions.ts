'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';

export async function addPaymentNote(formData: FormData) {
  const ctx = await requireAdmin();
  const paymentId = String(formData.get('payment_id') || '');
  const note = String(formData.get('note') || '').trim();

  if (!paymentId) redirect('/admin/payments');
  if (!note) {
    redirect(`/admin/payments/${paymentId}?error=${encodeURIComponent('الملاحظة فاضية.')}`);
  }

  await loggedAction(
    ctx,
    {
      action: 'payment.note_added',
      resourceType: 'payment',
      resourceId: paymentId,
      metadata: { note_chars: note.length },
    },
    async () => {
      const service = createServiceClient();
      const { error } = await service.from('payment_notes').insert({
        payment_id: paymentId,
        author_id: ctx.userId,
        author_email: ctx.userEmail,
        note: note.slice(0, 4000),
      });
      if (error) throw new Error(error.message);
    }
  );

  revalidatePath(`/admin/payments/${paymentId}`);
  redirect(`/admin/payments/${paymentId}?success=note_added`);
}

/**
 * Record a refund locally. This is a SCAFFOLD — it does not call any
 * gateway API. Use it when you've already refunded via the Stripe or
 * Paymob dashboard and need the DB to reflect that. A future PR will
 * wire live Stripe/Paymob refund calls in front of this insert.
 */
export async function recordManualRefund(formData: FormData) {
  const ctx = await requireAdmin();
  const paymentId = String(formData.get('payment_id') || '');
  const amountCents = parseInt(String(formData.get('amount_cents') || '0'), 10);
  const reason = String(formData.get('reason') || '').trim() || null;
  const internalNotes = String(formData.get('internal_notes') || '').trim() || null;
  const gatewayRefundId = String(formData.get('gateway_refund_id') || '').trim() || null;
  const cancelSubscription = formData.get('cancel_subscription') === 'on';

  if (!paymentId) redirect('/admin/payments');
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    redirect(`/admin/payments/${paymentId}?error=${encodeURIComponent('مبلغ الاسترداد مش صحيح.')}`);
  }

  await loggedAction(
    ctx,
    {
      action: 'payment.refund_recorded',
      resourceType: 'payment',
      resourceId: paymentId,
      metadata: {
        amount_cents: amountCents,
        reason,
        gateway_refund_id: gatewayRefundId,
        cancel_subscription: cancelSubscription,
      },
    },
    async () => {
      const service = createServiceClient();

      // Load the payment to validate amount and grab the subscription_id.
      const { data: payment, error: loadErr } = await service
        .from('payments')
        .select('id, amount_cents, status, subscription_id')
        .eq('id', paymentId)
        .single();
      if (loadErr || !payment) throw new Error(loadErr?.message || 'الدفعة مش موجودة');
      if (payment.status === 'refunded') {
        throw new Error('الدفعة دي تم استردادها بالفعل.');
      }

      // Sum existing refunds + this one mustn't exceed the original.
      const { data: priorRefunds } = await service
        .from('refunds')
        .select('amount_cents')
        .eq('payment_id', paymentId);
      const refundedSoFar = (priorRefunds || []).reduce(
        (acc, r) => acc + (r.amount_cents || 0),
        0
      );
      if (refundedSoFar + amountCents > payment.amount_cents) {
        throw new Error('مجموع المسترد أكبر من قيمة الدفعة الأصلية.');
      }

      const { error: insErr } = await service.from('refunds').insert({
        payment_id: paymentId,
        amount_cents: amountCents,
        reason,
        internal_notes: internalNotes,
        gateway_refund_id: gatewayRefundId,
        refunded_by: ctx.userId,
        refunded_by_email: ctx.userEmail,
      });
      if (insErr) throw new Error(insErr.message);

      // Mark payment refunded once total refunded == original.
      const fullyRefunded = refundedSoFar + amountCents === payment.amount_cents;
      if (fullyRefunded) {
        await service
          .from('payments')
          .update({ status: 'refunded' })
          .eq('id', paymentId);
      }

      if (cancelSubscription && payment.subscription_id) {
        await service
          .from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', payment.subscription_id);
      }
    }
  ).catch((err) => {
    redirect(
      `/admin/payments/${paymentId}?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'فشل تسجيل الاسترداد'
      )}`
    );
  });

  revalidatePath(`/admin/payments/${paymentId}`);
  revalidatePath('/admin/payments');
  redirect(`/admin/payments/${paymentId}?success=refund_recorded`);
}

/**
 * Record a refund for a student who doesn't have a payment row yet —
 * typically the bulk-imported students from before we started tracking
 * manual payments. Creates a back-filled payments row (gateway=manual,
 * status=paid) and immediately refunds it in one operation so the
 * revenue and refunds dashboards see the correct numbers without the
 * admin having to do a two-step entry.
 *
 * The created payment carries metadata.source='retroactive_refund' so
 * we can tell it apart from real income later.
 */
export async function recordAdHocRefund(formData: FormData) {
  const ctx = await requireAdmin();
  const userId = String(formData.get('user_id') || '');
  const amountCents = parseInt(String(formData.get('amount_cents') || '0'), 10);
  const reason = String(formData.get('reason') || '').trim() || null;
  const cancelSub = formData.get('cancel_subscription') === 'on';

  if (!userId) {
    redirect('/admin/students?error=' + encodeURIComponent('الطالب مش موجود.'));
  }
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    redirect(
      `/admin/students/${userId}?error=` +
        encodeURIComponent('مبلغ الاسترداد لازم يكون أكبر من صفر.')
    );
  }

  await loggedAction(
    ctx,
    {
      action: 'payment.adhoc_refund_recorded',
      resourceType: 'profile',
      resourceId: userId,
      metadata: { amount_cents: amountCents, reason, cancel_subscription: cancelSub },
    },
    async () => {
      const service = createServiceClient();

      // Step 1: back-fill the missing payment so the refunds table FK
      // is satisfied. status=paid for one beat, then status=refunded
      // after the refund row is inserted — keeps the audit linear.
      const { data: createdPayment, error: payErr } = await service
        .from('payments')
        .insert({
          user_id: userId,
          amount_cents: amountCents,
          currency: 'USD',
          gateway: 'manual',
          status: 'paid',
          metadata: {
            source: 'retroactive_refund',
            recorded_by: ctx.userEmail,
            note: 'Back-filled when admin processed an ad-hoc refund',
          },
        })
        .select('id, subscription_id')
        .single();
      if (payErr || !createdPayment) {
        throw new Error(payErr?.message || 'فشل إنشاء سجل الدفعة.');
      }

      // Step 2: insert the matching refund row.
      const { error: refErr } = await service.from('refunds').insert({
        payment_id: createdPayment.id,
        amount_cents: amountCents,
        reason,
        internal_notes: 'Ad-hoc refund — payment back-filled in same operation',
        refunded_by: ctx.userId,
        refunded_by_email: ctx.userEmail,
      });
      if (refErr) throw new Error(refErr.message);

      // Step 3: flip payment status so the dashboard treats it as
      // fully refunded (matching the existing recordManualRefund flow).
      await service
        .from('payments')
        .update({ status: 'refunded' })
        .eq('id', createdPayment.id);

      // Step 4: cancel any active subscription if asked. We don't tie
      // it to a specific subscription_id (we made up the payment),
      // so cancel the latest active row on the user.
      if (cancelSub) {
        await service
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .in('status', ['active', 'trialing']);
      }
    }
  ).catch((err) => {
    redirect(
      `/admin/students/${userId}?error=` +
        encodeURIComponent(err instanceof Error ? err.message : 'فشل تسجيل الاسترداد')
    );
  });

  revalidatePath(`/admin/students/${userId}`);
  revalidatePath('/admin/revenue');
  redirect(`/admin/students/${userId}?success=refund_recorded`);
}
