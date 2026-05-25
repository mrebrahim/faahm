'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';

export async function cancelSubscription(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const mode = (String(formData.get('mode') || 'immediate') as 'immediate' | 'period_end');
  if (!id) redirect('/admin/subscriptions');

  await loggedAction(
    ctx,
    {
      action: 'subscription.cancelled',
      resourceType: 'subscription',
      resourceId: id,
      metadata: { mode },
    },
    async () => {
      const service = createServiceClient();
      const now = new Date().toISOString();
      const update: Record<string, unknown> = { cancelled_at: now };
      if (mode === 'immediate') update.status = 'cancelled';
      const { error } = await service.from('subscriptions').update(update).eq('id', id);
      if (error) throw new Error(error.message);
    }
  );

  revalidatePath('/admin/subscriptions');
  redirect('/admin/subscriptions?success=cancelled');
}

export async function extendSubscription(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const days = Math.max(1, Math.min(3650, parseInt(String(formData.get('days') || '30'), 10)));
  if (!id) redirect('/admin/subscriptions');

  await loggedAction(
    ctx,
    {
      action: 'subscription.extended',
      resourceType: 'subscription',
      resourceId: id,
      metadata: { days },
    },
    async () => {
      const service = createServiceClient();
      const { data: sub, error: readErr } = await service
        .from('subscriptions')
        .select('current_period_end')
        .eq('id', id)
        .single();
      if (readErr || !sub) throw new Error(readErr?.message || 'الاشتراك مش موجود');

      // Extend from the later of (current end, now) so cancelled subs
      // don't get a backdated extension.
      const base = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
      const next = base.getTime() < Date.now() ? new Date() : base;
      next.setDate(next.getDate() + days);

      const { error } = await service
        .from('subscriptions')
        .update({
          current_period_end: next.toISOString(),
          status: 'active',
          cancelled_at: null,
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
  );

  revalidatePath('/admin/subscriptions');
  redirect('/admin/subscriptions?success=extended');
}

export async function grantManualSubscription(formData: FormData) {
  const ctx = await requireAdmin();
  const userId = String(formData.get('user_id') || '');
  const plan = (String(formData.get('plan') || 'monthly') as 'monthly' | 'yearly');
  const days = Math.max(1, Math.min(3650, parseInt(String(formData.get('days') || '30'), 10)));
  const reason = String(formData.get('reason') || '').trim() || null;

  if (!userId) {
    redirect(`/admin/subscriptions/new?error=${encodeURIComponent('اختار مستخدم.')}`);
  }

  await loggedAction(
    ctx,
    {
      action: 'subscription.granted_manually',
      resourceType: 'subscription',
      metadata: { user_id: userId, plan, days, reason },
    },
    async () => {
      const service = createServiceClient();
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + days);

      // Extend an existing active subscription instead of creating a
      // duplicate row — keeps history clean.
      const { data: existing } = await service
        .from('subscriptions')
        .select('id, current_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        const base = existing.current_period_end
          ? new Date(existing.current_period_end)
          : now;
        const nextEnd = base.getTime() < now.getTime() ? new Date(now) : new Date(base);
        nextEnd.setDate(nextEnd.getDate() + days);
        const { error } = await service
          .from('subscriptions')
          .update({
            current_period_end: nextEnd.toISOString(),
            plan,
            status: 'active',
            cancelled_at: null,
          })
          .eq('id', existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await service.from('subscriptions').insert({
          user_id: userId,
          plan,
          status: 'active',
          gateway: 'manual',
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
        });
        if (error) throw new Error(error.message);
      }
    }
  ).catch((err) => {
    redirect(
      `/admin/subscriptions/new?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'فشل المنح'
      )}`
    );
  });

  revalidatePath('/admin/subscriptions');
  redirect('/admin/subscriptions?success=granted');
}
