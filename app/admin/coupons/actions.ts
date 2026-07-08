'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction, formDataForLog } from '@/lib/admin-audit';

const CODE_REGEX = /^[A-Z0-9_-]{4,20}$/;

function parseCouponForm(formData: FormData) {
  const code = String(formData.get('code') || '').trim().toUpperCase();
  const discount_type = String(formData.get('discount_type') || 'percent') as
    | 'percent'
    | 'fixed'
    | 'free_course'
    | 'free_subscription';
  const discount_value = parseInt(String(formData.get('discount_value') || '0'), 10);
  const isGrant = discount_type === 'free_course' || discount_type === 'free_subscription';
  const applies_to = isGrant ? null : String(formData.get('applies_to') || 'all');
  const course_id =
    discount_type === 'free_course'
      ? String(formData.get('course_id') || '').trim() || null
      : null;
  const subscription_plan =
    discount_type === 'free_subscription'
      ? (String(formData.get('subscription_plan') || 'monthly') as 'monthly' | 'yearly')
      : null;
  const max_uses_raw = String(formData.get('max_uses') || '').trim();
  const max_uses = max_uses_raw === '' ? null : Math.max(1, parseInt(max_uses_raw, 10));
  const max_uses_per_user_raw = String(formData.get('max_uses_per_user') || '1').trim();
  const max_uses_per_user =
    max_uses_per_user_raw === '' ? null : Math.max(1, parseInt(max_uses_per_user_raw, 10));
  const expires_at_raw = String(formData.get('expires_at') || '').trim();
  const expires_at = expires_at_raw ? new Date(expires_at_raw).toISOString() : null;
  const is_active = formData.get('is_active') === 'on';
  const description = String(formData.get('description') || '').trim() || null;

  if (!CODE_REGEX.test(code)) {
    throw new Error('الكود لازم يكون من 4 لـ 20 حرف وأرقام كابيتال أو شرطة فقط.');
  }
  if (discount_type === 'percent' && (discount_value < 1 || discount_value > 100)) {
    throw new Error('النسبة لازم بين 1 و 100.');
  }
  if (discount_type === 'fixed' && (discount_value < 1 || discount_value > 999900)) {
    throw new Error('المبلغ الثابت (بالـ cents) لازم بين 1 و 999900.');
  }
  if (discount_type === 'free_course' && !course_id) {
    throw new Error('اختار الكورس اللي هيتفتح مجاناً.');
  }
  if (discount_type === 'free_subscription' && !subscription_plan) {
    throw new Error('اختار مدة الاشتراك المجاني.');
  }
  if (expires_at && new Date(expires_at).getTime() < Date.now()) {
    throw new Error('تاريخ الانتهاء لازم يكون في المستقبل.');
  }

  return {
    code,
    discount_type,
    discount_value,
    applies_to,
    course_id,
    subscription_plan,
    max_uses,
    max_uses_per_user,
    expires_at,
    is_active,
    description,
  };
}

export async function createCoupon(formData: FormData) {
  const ctx = await requireAdmin();
  let row: ReturnType<typeof parseCouponForm>;
  try {
    row = parseCouponForm(formData);
  } catch (err) {
    redirect(
      `/admin/coupons/new?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'بيانات غير صحيحة'
      )}`
    );
  }

  let newId: string | null = null;
  try {
    newId = await loggedAction(
      ctx,
      {
        action: 'coupon.created',
        resourceType: 'coupon',
        metadata: { payload: formDataForLog(formData) },
      },
      async () => {
        const service = createServiceClient();
        const { data, error } = await service
          .from('coupons')
          .insert({ ...row, created_by: ctx.userId })
          .select('id')
          .single();
        if (error) {
          if (error.code === '23505') {
            throw new Error('الكود ده موجود بالفعل.');
          }
          throw new Error(error.message);
        }
        return data.id as string;
      }
    );
  } catch (err) {
    redirect(
      `/admin/coupons/new?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'فشل إنشاء الكوبون'
      )}`
    );
  }

  revalidatePath('/admin/coupons');
  redirect(`/admin/coupons/${newId}?success=created`);
}

export async function updateCoupon(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  if (!id) redirect('/admin/coupons');

  let row: ReturnType<typeof parseCouponForm>;
  try {
    row = parseCouponForm(formData);
  } catch (err) {
    redirect(
      `/admin/coupons/${id}?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'بيانات غير صحيحة'
      )}`
    );
  }

  await loggedAction(
    ctx,
    {
      action: 'coupon.updated',
      resourceType: 'coupon',
      resourceId: id,
      metadata: { payload: formDataForLog(formData) },
    },
    async () => {
      const service = createServiceClient();
      const { error } = await service.from('coupons').update(row).eq('id', id);
      if (error) throw new Error(error.message);
    }
  ).catch((err) => {
    redirect(
      `/admin/coupons/${id}?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'فشل تحديث الكوبون'
      )}`
    );
  });

  revalidatePath(`/admin/coupons/${id}`);
  revalidatePath('/admin/coupons');
  redirect(`/admin/coupons/${id}?success=updated`);
}

export async function toggleCouponActive(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const current = formData.get('is_active') === 'true';
  if (!id) redirect('/admin/coupons');

  await loggedAction(
    ctx,
    {
      action: current ? 'coupon.disabled' : 'coupon.enabled',
      resourceType: 'coupon',
      resourceId: id,
    },
    async () => {
      const service = createServiceClient();
      const { error } = await service
        .from('coupons')
        .update({ is_active: !current })
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
  );

  revalidatePath(`/admin/coupons/${id}`);
  revalidatePath('/admin/coupons');
}
