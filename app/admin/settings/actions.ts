'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction, formDataForLog } from '@/lib/admin-audit';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export async function updateSiteSettings(formData: FormData) {
  const ctx = await requireAdmin();

  const support_email =
    String(formData.get('support_email') || '').trim() || null;
  const support_whatsapp =
    String(formData.get('support_whatsapp') || '').trim() || null;
  const footer_note_ar =
    String(formData.get('footer_note_ar') || '').trim() || null;

  const passing = parseInt(
    String(formData.get('default_quiz_passing_score') || '70'),
    10
  );
  const attempts = parseInt(
    String(formData.get('default_quiz_max_attempts') || '3'),
    10
  );
  const certMin = parseInt(
    String(formData.get('certificate_min_score') || '70'),
    10
  );

  const default_quiz_passing_score = Math.max(0, Math.min(100, isNaN(passing) ? 70 : passing));
  const default_quiz_max_attempts = Math.max(1, Math.min(50, isNaN(attempts) ? 3 : attempts));
  const certificate_min_score = Math.max(0, Math.min(100, isNaN(certMin) ? 70 : certMin));

  const default_video_provider =
    String(formData.get('default_video_provider') || 'bunny') === 'vimeo'
      ? 'vimeo'
      : 'bunny';

  // Light validation on optional contact fields. We don't want a hard
  // failure on a typo'd email — keep this permissive but reject obvious
  // garbage (whitespace mid-string, no @).
  if (support_email && (!support_email.includes('@') || /\s/.test(support_email))) {
    redirect(
      `/admin/settings?error=${encodeURIComponent('بريد الدعم غير صحيح.')}`
    );
  }
  if (
    support_whatsapp &&
    !/^[0-9+\-\s()]{4,32}$/.test(support_whatsapp)
  ) {
    redirect(
      `/admin/settings?error=${encodeURIComponent('رقم واتساب الدعم غير صحيح.')}`
    );
  }

  await loggedAction(
    ctx,
    {
      action: 'site_settings.updated',
      resourceType: 'site_settings',
      resourceId: SETTINGS_ID,
      metadata: { payload: formDataForLog(formData) },
    },
    async () => {
      const service = createServiceClient();
      const { error } = await service
        .from('site_settings')
        .update({
          support_email,
          support_whatsapp,
          footer_note_ar,
          default_quiz_passing_score,
          default_quiz_max_attempts,
          default_video_provider,
          certificate_min_score,
          updated_at: new Date().toISOString(),
          updated_by: ctx.userId,
          updated_by_email: ctx.userEmail,
        })
        .eq('id', SETTINGS_ID);
      if (error) throw new Error(error.message);
    }
  ).catch((err) => {
    redirect(
      `/admin/settings?error=${encodeURIComponent(
        err instanceof Error ? err.message : 'فشل الحفظ'
      )}`
    );
  });

  revalidatePath('/admin/settings');
  redirect('/admin/settings?success=saved');
}
