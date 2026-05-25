'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction, formDataForLog } from '@/lib/admin-audit';
import { parseVideoInput, type VideoProvider } from '@/lib/video';

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

      // Trailer fields: only persist when admin entered something. Parse the
      // raw input through the provider so a pasted URL is normalised into
      // (provider, video_id, library_id).
      const trailerProvider = (formData.get('trailer_video_provider') as VideoProvider) || 'bunny';
      const trailerRaw = (formData.get('trailer_video_id') as string) || '';
      let trailerFields: Record<string, unknown> = {
        trailer_video_provider: trailerProvider,
        trailer_video_id: null,
        trailer_video_library_id: null,
      };
      if (trailerRaw.trim()) {
        const parsed = parseVideoInput(trailerProvider, trailerRaw);
        if (!parsed) {
          throw new Error('رابط الفيديو التشويقي مش صحيح للمزوّد المختار');
        }
        trailerFields = {
          trailer_video_provider: trailerProvider,
          trailer_video_id: parsed.video_id,
          trailer_video_library_id: parsed.video_library_id,
        };
      }

      // Textarea → string[]: split on newlines, trim, drop empties.
      // Hard cap of 30 bullets each — generous, but prevents abuse.
      const linesToArray = (raw: string | null) =>
        (raw || '')
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 30);

      const updates = {
        title_ar: formData.get('title_ar') as string,
        description_ar: (formData.get('description_ar') as string) || null,
        category_id: (formData.get('category_id') as string) || null,
        level: formData.get('level') as string,
        thumbnail_url: (formData.get('thumbnail_url') as string) || null,
        what_you_learn: linesToArray(formData.get('what_you_learn') as string | null),
        requirements: linesToArray(formData.get('requirements') as string | null),
        ...trailerFields,
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
  const provider = ((formData.get('video_provider') as string) || 'bunny') as VideoProvider;
  const raw = (formData.get('video_id') as string) || '';
  const duration_sec = parseInt((formData.get('duration_sec') as string) || '0', 10);
  const is_free_preview = formData.get('is_free_preview') === 'on';

  if (!title_ar || !raw.trim()) {
    redirect(
      `/admin/courses/${course_id}?error=${encodeURIComponent('العنوان ومعرّف الفيديو مطلوبين')}`
    );
  }

  const parsed = parseVideoInput(provider, raw);
  if (!parsed) {
    redirect(
      `/admin/courses/${course_id}?error=${encodeURIComponent(
        'رابط/معرّف الفيديو مش صحيح للمزوّد المختار'
      )}`
    );
  }

  await loggedAction(
    ctx,
    {
      action: 'lesson.create',
      resourceType: 'lesson',
      metadata: {
        course_id,
        chapter_id,
        title_ar,
        provider,
        is_free_preview,
      },
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
        video_provider: provider,
        video_id: parsed!.video_id,
        video_library_id: parsed!.video_library_id,
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
    .select('title_ar, video_provider, video_id')
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
