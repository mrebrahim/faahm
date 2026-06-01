'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getActiveSubscription } from '@/lib/access';

/**
 * Mark a lesson as completed (idempotent).
 * Allowed for: logged-in users who either (a) have an active sub, or
 * (b) are completing a free-preview lesson.
 */
export async function markLessonComplete(formData: FormData) {
  const lessonId = String(formData.get('lesson_id') || '');
  if (!lessonId) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const service = createServiceClient();

  const { data: lesson } = await service
    .from('lessons')
    .select('id, course_id, is_free_preview')
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) return;

  if (!lesson.is_free_preview) {
    const sub = await getActiveSubscription(user.id);
    if (!sub) return;
  }

  await service
    .from('progress')
    .upsert(
      {
        user_id: user.id,
        lesson_id: lesson.id,
        course_id: lesson.course_id,
        is_completed: true,
        completed_at: new Date().toISOString(),
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );

  // Bust the router cache wherever this user's completed-count is rendered:
  // the lesson page itself, the student dashboard, the course outline, and
  // the per-student progress tab in admin.
  revalidatePath(`/lesson/${lessonId}`);
  revalidatePath('/dashboard');
  revalidatePath('/course/[slug]', 'page');
  revalidatePath('/admin/students/[id]', 'page');
}

/**
 * Persist the user's current watch position. Called by the player every
 * ~15s while the video is playing. Best-effort — we don't throw on auth
 * failure since this is a fire-and-forget heartbeat.
 */
export async function updateWatchProgress(lessonId: string, watchedSec: number) {
  if (!lessonId || !Number.isFinite(watchedSec) || watchedSec < 0) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const service = createServiceClient();

  const { data: lesson } = await service
    .from('lessons')
    .select('id, course_id, is_free_preview, duration_sec')
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) return;

  if (!lesson.is_free_preview) {
    const sub = await getActiveSubscription(user.id);
    if (!sub) return;
  }

  // Auto-complete once we cross 90% (PRD §6.4.4).
  const shouldComplete =
    lesson.duration_sec > 0 && watchedSec >= lesson.duration_sec * 0.9;

  await service.from('progress').upsert(
    {
      user_id: user.id,
      lesson_id: lesson.id,
      course_id: lesson.course_id,
      watched_sec: Math.floor(watchedSec),
      is_completed: shouldComplete ? true : undefined,
      completed_at: shouldComplete ? new Date().toISOString() : undefined,
      last_watched_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' }
  );

  // Only bust router caches when this heartbeat actually flipped the
  // lesson into 'completed' — otherwise we'd be invalidating /dashboard
  // every 15 seconds for no visible change.
  if (shouldComplete) {
    revalidatePath(`/lesson/${lessonId}`);
    revalidatePath('/dashboard');
    revalidatePath('/course/[slug]', 'page');
    revalidatePath('/admin/students/[id]', 'page');
  }
}
