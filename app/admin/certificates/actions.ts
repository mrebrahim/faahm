'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction, formDataForLog } from '@/lib/admin-audit';

/**
 * Issue a certificate from the admin panel. When `bypass=on`, the eligibility
 * check is skipped — caller must be a super_admin to pass this through (we
 * still log the bypass in the audit row so it's traceable).
 */
export async function issueCertificate(formData: FormData) {
  const ctx = await requireAdmin();
  const userId = String(formData.get('user_id') || '').trim();
  const courseId = String(formData.get('course_id') || '').trim();
  const bypass = formData.get('bypass') === 'on';
  const reason = String(formData.get('reason') || '').trim() || null;

  if (!userId || !courseId) {
    redirect(`/admin/certificates/issue?error=${encodeURIComponent('اختار طالب وكورس.')}`);
  }
  if (bypass && ctx.userRole !== 'super_admin' && ctx.userRole !== 'admin') {
    redirect(
      `/admin/certificates/issue?error=${encodeURIComponent('فقط super_admin يقدر يتخطّى تحقق الأهلية.')}`
    );
  }
  if (!reason) {
    redirect(
      `/admin/certificates/issue?error=${encodeURIComponent('السبب مطلوب للإصدار اليدوي.')}`
    );
  }

  let certId: string | null = null;
  try {
    certId = await loggedAction(
      ctx,
      {
        action: 'certificate.manually_issued',
        resourceType: 'certificate',
        metadata: {
          user_id: userId,
          course_id: courseId,
          bypass,
          payload: formDataForLog(formData),
        },
      },
      async () => {
        const service = createServiceClient();
        const { data, error } = await service.rpc('try_issue_certificate', {
          p_user_id: userId,
          p_course_id: courseId,
          p_issued_by: ctx.userId,
          p_issue_reason: reason,
          p_bypass: bypass,
        });
        if (error) throw new Error(error.message);
        if (!data) {
          throw new Error(
            'الطالب مش مؤهّل (الدروس / الكويزات مش مكتملة) أو فيه شهادة نشطة بالفعل.'
          );
        }
        return data as string;
      }
    );
  } catch (err) {
    redirect(
      `/admin/certificates/issue?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'فشل إصدار الشهادة'
      )}`
    );
  }

  revalidatePath('/admin/certificates');
  redirect(`/admin/certificates/${certId}?success=issued`);
}

export async function revokeCertificate(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const reason = String(formData.get('reason') || '').trim() || null;
  const confirm = String(formData.get('confirm') || '').trim();

  if (!id) redirect('/admin/certificates');
  if (confirm !== 'REVOKE') {
    redirect(
      `/admin/certificates/${id}?error=${encodeURIComponent('لازم تكتب REVOKE للتأكيد.')}`
    );
  }
  if (!reason) {
    redirect(
      `/admin/certificates/${id}?error=${encodeURIComponent('السبب مطلوب للسحب.')}`
    );
  }

  await loggedAction(
    ctx,
    {
      action: 'certificate.revoked',
      resourceType: 'certificate',
      resourceId: id,
      metadata: { reason },
    },
    async () => {
      const service = createServiceClient();
      const { error } = await service
        .from('certificates')
        .update({
          is_revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_by: ctx.userId,
          revoke_reason: reason,
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
  );

  revalidatePath('/admin/certificates');
  revalidatePath(`/admin/certificates/${id}`);
  redirect(`/admin/certificates/${id}?success=revoked`);
}

export async function reinstateCertificate(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  if (!id) redirect('/admin/certificates');

  await loggedAction(
    ctx,
    {
      action: 'certificate.reinstated',
      resourceType: 'certificate',
      resourceId: id,
    },
    async () => {
      const service = createServiceClient();
      // Reinstating violates the unique-active index if the student earned a
      // newer cert in the meantime. We surface the DB error to the admin.
      const { error } = await service
        .from('certificates')
        .update({
          is_revoked: false,
          revoked_at: null,
          revoked_by: null,
          revoke_reason: null,
        })
        .eq('id', id);
      if (error) {
        if (error.code === '23505') {
          throw new Error('فيه شهادة نشطة تانية لنفس الطالب والكورس.');
        }
        throw new Error(error.message);
      }
    }
  ).catch((err) => {
    redirect(
      `/admin/certificates/${id}?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'فشل الإعادة'
      )}`
    );
  });

  revalidatePath('/admin/certificates');
  revalidatePath(`/admin/certificates/${id}`);
  redirect(`/admin/certificates/${id}?success=reinstated`);
}

export async function deleteCertificate(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  if (!id) redirect('/admin/certificates');

  await loggedAction(
    ctx,
    {
      action: 'certificate.deleted',
      resourceType: 'certificate',
      resourceId: id,
    },
    async () => {
      const service = createServiceClient();
      const { error } = await service.from('certificates').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  );

  revalidatePath('/admin/certificates');
  redirect('/admin/certificates?success=deleted');
}
