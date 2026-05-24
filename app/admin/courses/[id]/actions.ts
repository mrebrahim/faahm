'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction, formDataForLog } from '@/lib/admin-audit';

// ============================================================================
// COURSE
// ============================================================================
export async function updateCourse(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;

  await loggedAction(
    ctx,
    {
      action: 'course.update',
      resourceType: 'course',
      resourceId: id,
      metadata: { payload: formDataForLog(formData) },
    },
    async () => {
      const service = createServiceClient();
      const updates = {
        title_ar: formData.get('title_ar') as string,
        description_ar: (formData.get('description_ar') as string) || null,
        category_id: (formData.get('category_id') as string) || null,
        level: formData.get('level') as string,
        thumbnail_url: (formData.get('thumbnail_url') as string) || null,
        trailer_vimeo_id: (formData.get('trailer_vimeo_id') as string) || null,
      };

      const { error } = await service.from('courses').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
    }
  ).catch((err) => {
    redirect(`/admin/courses/${id}?error=${encodeURIComponent(err.message)}`);
  });

  revalidatePath(`/admin/courses/${id}`);
  redirect(`/admin/courses/${id}?success=updated`);
}

export async function togglePublishCourse(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;
  const currentlyPublished = formData.get('is_published') === 'true';
  const nextState = !currentlyPublished;

  await loggedAction(
    ctx,
    {
      action: nextState ? 'course.publish' : 'course.unpublish',
      resourceType: 'course',
      resourceId: id,
    },
    async () => {
      const service = createServiceClient();
      await service
        .from('courses')
        .update({
          is_published: nextState,
          published_at: nextState ? new Date().toISOString() : null,
        })
        .eq('id', id);
    }
  );

  revalidatePath(`/admin/courses/${id}`);
  revalidatePath('/admin/courses');
}

export async function deleteCourse(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;

  // Capture identifying metadata BEFORE delete so the audit log keeps a
  // record of what was destroyed, not just an orphan UUID.
  const service = createServiceClient();
  const { data: existing } = await service
    .from('courses')
    .select('slug, title_ar, is_published')
    .eq('id', id)
    .maybeSingle();

  await loggedAction(
    ctx,
    {
      action: 'course.delete',
      resourceType: 'course',
      resourceId: id,
      metadata: { snapshot: existing },
    },
    async () => {
      await service.from('courses').delete().eq('id', id);
    }
  );

  revalidatePath('/admin/courses');
  redirect('/admin/courses');
}

// ============================================================================
// CHAPTERS
// ============================================================================
export async function createChapter(formData: FormData) {
  const ctx = await requireAdmin();
  const course_id = formData.get('course_id') as string;
  const title_ar = formData.get('title_ar') as string;
  if (!title_ar) return;

  await loggedAction(
    ctx,
    {
      action: 'chapter.create',
      resourceType: 'chapter',
      metadata: { course_id, title_ar },
    },
    async () => {
      const service = createServiceClient();
      const { count } = await service
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course_id);

      await service.from('chapters').insert({
        course_id,
        title_ar,
        sort_order: count || 0,
      });
    }
  );

  revalidatePath(`/admin/courses/${course_id}`);
}

export async function deleteChapter(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;
  const course_id = formData.get('course_id') as string;

  await loggedAction(
    ctx,
    {
      action: 'chapter.delete',
      resourceType: 'chapter',
      resourceId: id,
      metadata: { course_id },
    },
    async () => {
      const service = createServiceClient();
      await service.from('chapters').delete().eq('id', id);
    }
  );

  revalidatePath(`/admin/courses/${course_id}`);
}

// ============================================================================
// LESSONS
// ============================================================================
export async function createLesson(formData: FormData) {
  const ctx = await requireAdmin();
  const chapter_id = formData.get('chapter_id') as string;
  const course_id = formData.get('course_id') as string;
  const title_ar = formData.get('title_ar') as string;
  const vimeo_video_id = formData.get('vimeo_video_id') as string;
  const duration_sec = parseInt((formData.get('duration_sec') as string) || '0', 10);
  const is_free_preview = formData.get('is_free_preview') === 'on';

  if (!title_ar || !vimeo_video_id) {
    redirect(
      `/admin/courses/${course_id}?error=${encodeURIComponent('العنوان و Vimeo ID مطلوبين')}`
    );
  }

  await loggedAction(
    ctx,
    {
      action: 'lesson.create',
      resourceType: 'lesson',
      metadata: { course_id, chapter_id, title_ar, is_free_preview },
    },
    async () => {
      const service = createServiceClient();
      const { count } = await service
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapter_id);

      await service.from('lessons').insert({
        chapter_id,
        course_id,
        title_ar,
        vimeo_video_id: vimeo_video_id.trim(),
        duration_sec,
        is_free_preview,
        sort_order: count || 0,
      });
    }
  );

  revalidatePath(`/admin/courses/${course_id}`);
}

export async function deleteLesson(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;
  const course_id = formData.get('course_id') as string;

  const service = createServiceClient();
  const { data: existing } = await service
    .from('lessons')
    .select('title_ar, vimeo_video_id')
    .eq('id', id)
    .maybeSingle();

  await loggedAction(
    ctx,
    {
      action: 'lesson.delete',
      resourceType: 'lesson',
      resourceId: id,
      metadata: { course_id, snapshot: existing },
    },
    async () => {
      await service.from('lessons').delete().eq('id', id);
    }
  );

  revalidatePath(`/admin/courses/${course_id}`);
}

export async function togglePreviewLesson(formData: FormData) {
  const ctx = await requireAdmin();
  const id = formData.get('id') as string;
  const course_id = formData.get('course_id') as string;
  const current = formData.get('is_free_preview') === 'true';

  await loggedAction(
    ctx,
    {
      action: 'lesson.set_free_preview',
      resourceType: 'lesson',
      resourceId: id,
      metadata: { course_id, from: current, to: !current },
    },
    async () => {
      const service = createServiceClient();
      await service.from('lessons').update({ is_free_preview: !current }).eq('id', id);
    }
  );

  revalidatePath(`/admin/courses/${course_id}`);
}
