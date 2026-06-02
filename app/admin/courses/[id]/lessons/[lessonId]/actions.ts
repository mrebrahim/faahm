'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction, formDataForLog } from '@/lib/admin-audit';
import { parseVideoInput, type VideoProvider } from '@/lib/video';
import { deleteLessonAttachmentObject } from '@/lib/storage';

/**
 * Update a lesson's metadata + (re)assign its video source. The
 * video_id field accepts a bare GUID/ID OR a full URL — parseVideoInput
 * normalises it per provider.
 */
export async function updateLesson(formData: FormData) {
  const ctx = await requireAdmin();
  const lessonId = String(formData.get('id') || '');
  const courseId = String(formData.get('course_id') || '');
  if (!lessonId) return;

  const title_ar = String(formData.get('title_ar') || '').trim();
  const description_ar = String(formData.get('description_ar') || '').trim() || null;
  const provider = ((formData.get('video_provider') as string) || 'bunny') as VideoProvider;
  const rawVideo = String(formData.get('video_id') || '').trim();
  const duration_sec = parseInt(String(formData.get('duration_sec') || '0'), 10) || 0;
  const is_free_preview = formData.get('is_free_preview') === 'on';

  if (!title_ar) {
    redirect(
      `/admin/courses/${courseId}/lessons/${lessonId}?error=${encodeURIComponent('عنوان الدرس مطلوب')}`
    );
  }

  const updates: Record<string, unknown> = {
    title_ar,
    description_ar,
    duration_sec,
    is_free_preview,
  };

  if (rawVideo) {
    const parsed = parseVideoInput(provider, rawVideo);
    if (!parsed) {
      redirect(
        `/admin/courses/${courseId}/lessons/${lessonId}?error=${encodeURIComponent('رابط/معرّف الفيديو غير صالح')}`
      );
    }
    updates.video_provider = provider;
    updates.video_id = parsed!.video_id;
    // If the admin pasted just a GUID, copy the library id from the
    // course's other lessons (or leave null for non-Bunny providers).
    if (parsed!.video_library_id) {
      updates.video_library_id = parsed!.video_library_id;
    } else if (provider === 'bunny') {
      const service = createServiceClient();
      const { data: lessonLibs } = await service
        .from('lessons')
        .select('video_library_id')
        .eq('course_id', courseId)
        .not('video_library_id', 'is', null)
        .neq('id', lessonId)
        .limit(50);
      const unique = new Set(
        (lessonLibs || [])
          .map((r: { video_library_id: string | null }) => r.video_library_id)
          .filter(Boolean) as string[]
      );
      updates.video_library_id = unique.size === 1 ? [...unique][0] : null;
    } else {
      updates.video_library_id = null;
    }
  }

  await loggedAction(
    ctx,
    {
      action: 'lesson.update',
      resourceType: 'lesson',
      resourceId: lessonId,
      metadata: { course_id: courseId, payload: formDataForLog(formData) },
    },
    async () => {
      const service = createServiceClient();
      const { error } = await service.from('lessons').update(updates).eq('id', lessonId);
      if (error) throw new Error(error.message);
    }
  );

  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
  redirect(`/admin/courses/${courseId}/lessons/${lessonId}?success=updated`);
}

/**
 * Drop a single attachment row and its underlying storage object (if any).
 */
export async function deleteAttachment(formData: FormData) {
  const ctx = await requireAdmin();
  const attachmentId = String(formData.get('attachment_id') || '');
  const lessonId = String(formData.get('lesson_id') || '');
  const courseId = String(formData.get('course_id') || '');
  if (!attachmentId) return;

  await loggedAction(
    ctx,
    {
      action: 'attachment.deleted',
      resourceType: 'lesson',
      resourceId: lessonId,
      metadata: { attachment_id: attachmentId },
    },
    async () => {
      const service = createServiceClient();
      const { data: existing } = await service
        .from('lesson_attachments')
        .select('storage_path, file_name_ar')
        .eq('id', attachmentId)
        .maybeSingle();

      await service.from('lesson_attachments').delete().eq('id', attachmentId);
      // Best-effort: remove the underlying object from the bucket too.
      await deleteLessonAttachmentObject(existing?.storage_path);
    }
  );

  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
  redirect(`/admin/courses/${courseId}/lessons/${lessonId}?success=attachment_removed`);
}
