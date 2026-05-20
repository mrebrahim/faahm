'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/dashboard');
  return user;
}

// ============================================================================
// COURSE
// ============================================================================
export async function updateCourse(formData: FormData) {
  await requireAdmin();
  const service = createServiceClient();

  const id = formData.get('id') as string;
  const updates = {
    title_ar: formData.get('title_ar') as string,
    description_ar: (formData.get('description_ar') as string) || null,
    category_id: (formData.get('category_id') as string) || null,
    level: formData.get('level') as string,
    thumbnail_url: (formData.get('thumbnail_url') as string) || null,
    trailer_vimeo_id: (formData.get('trailer_vimeo_id') as string) || null,
  };

  const { error } = await service.from('courses').update(updates).eq('id', id);
  if (error) redirect(`/admin/courses/${id}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/admin/courses/${id}`);
  redirect(`/admin/courses/${id}?success=updated`);
}

export async function togglePublishCourse(formData: FormData) {
  await requireAdmin();
  const service = createServiceClient();

  const id = formData.get('id') as string;
  const currentlyPublished = formData.get('is_published') === 'true';

  await service
    .from('courses')
    .update({
      is_published: !currentlyPublished,
      published_at: !currentlyPublished ? new Date().toISOString() : null,
    })
    .eq('id', id);

  revalidatePath(`/admin/courses/${id}`);
  revalidatePath('/admin/courses');
}

export async function deleteCourse(formData: FormData) {
  await requireAdmin();
  const service = createServiceClient();
  const id = formData.get('id') as string;

  await service.from('courses').delete().eq('id', id);

  revalidatePath('/admin/courses');
  redirect('/admin/courses');
}

// ============================================================================
// CHAPTERS
// ============================================================================
export async function createChapter(formData: FormData) {
  await requireAdmin();
  const service = createServiceClient();

  const course_id = formData.get('course_id') as string;
  const title_ar = formData.get('title_ar') as string;

  if (!title_ar) return;

  // Determine sort order
  const { count } = await service
    .from('chapters')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', course_id);

  await service.from('chapters').insert({
    course_id,
    title_ar,
    sort_order: count || 0,
  });

  revalidatePath(`/admin/courses/${course_id}`);
}

export async function deleteChapter(formData: FormData) {
  await requireAdmin();
  const service = createServiceClient();

  const id = formData.get('id') as string;
  const course_id = formData.get('course_id') as string;

  await service.from('chapters').delete().eq('id', id);
  revalidatePath(`/admin/courses/${course_id}`);
}

// ============================================================================
// LESSONS
// ============================================================================
export async function createLesson(formData: FormData) {
  await requireAdmin();
  const service = createServiceClient();

  const chapter_id = formData.get('chapter_id') as string;
  const course_id = formData.get('course_id') as string;
  const title_ar = formData.get('title_ar') as string;
  const vimeo_video_id = formData.get('vimeo_video_id') as string;
  const duration_sec = parseInt((formData.get('duration_sec') as string) || '0', 10);
  const is_free_preview = formData.get('is_free_preview') === 'on';

  if (!title_ar || !vimeo_video_id) {
    redirect(`/admin/courses/${course_id}?error=${encodeURIComponent('العنوان و Vimeo ID مطلوبين')}`);
  }

  // Determine sort order within this chapter
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

  revalidatePath(`/admin/courses/${course_id}`);
}

export async function deleteLesson(formData: FormData) {
  await requireAdmin();
  const service = createServiceClient();

  const id = formData.get('id') as string;
  const course_id = formData.get('course_id') as string;

  await service.from('lessons').delete().eq('id', id);
  revalidatePath(`/admin/courses/${course_id}`);
}

export async function togglePreviewLesson(formData: FormData) {
  await requireAdmin();
  const service = createServiceClient();

  const id = formData.get('id') as string;
  const course_id = formData.get('course_id') as string;
  const current = formData.get('is_free_preview') === 'true';

  await service.from('lessons').update({ is_free_preview: !current }).eq('id', id);
  revalidatePath(`/admin/courses/${course_id}`);
}
