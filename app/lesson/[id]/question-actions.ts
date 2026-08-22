'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { canAccessCourse } from '@/lib/access';
import { askLessonQuestion } from '@/lib/lesson-questions';

/**
 * Ask a question from the web lesson page.
 *
 * Mirrors /api/mobile/question, including the access check — a question
 * is only accepted from someone who can actually open the lesson, so the
 * admin queue never fills with questions about unseen content.
 */
export async function askQuestionAction(formData: FormData) {
  const lessonId = String(formData.get('lesson_id') || '');
  if (!lessonId) redirect('/dashboard');

  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) redirect(`/login?redirect=/lesson/${lessonId}`);

  const { data: lesson } = await createServiceClient()
    .from('lessons')
    .select('id, course_id, is_free_preview')
    .eq('id', lessonId)
    .maybeSingle();

  if (!lesson) redirect('/dashboard');

  if (!lesson.is_free_preview) {
    const { subscribed, enrolled } = await canAccessCourse(user.id, lesson.course_id);
    if (!subscribed && !enrolled) {
      redirect(`/lesson/${lessonId}?qerror=${encodeURIComponent('مش مسموح.')}`);
    }
  }

  const result = await askLessonQuestion({
    userId: user.id,
    lessonId,
    question: String(formData.get('question') || ''),
  });

  revalidatePath(`/lesson/${lessonId}`);

  if ('error' in result) {
    redirect(`/lesson/${lessonId}?qerror=${encodeURIComponent(result.error)}`);
  }
  redirect(
    `/lesson/${lessonId}?qok=${encodeURIComponent('وصلنا سؤالك ✅ هنرد عليك على الإيميل.')}#questions`
  );
}
