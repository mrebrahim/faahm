import { createServiceClient } from '@/lib/supabase/server';
import { canAccessCourse } from '@/lib/access';
import { getMobileUser, jsonError, unauthorized } from '@/lib/mobile-auth';
import { awardLessonComplete, getUserXp, levelProgress } from '@/lib/xp';

export const dynamic = 'force-dynamic';

/**
 * Watch-progress heartbeat from the app.
 *
 * Body: { lesson_id, watched_sec, completed? }
 *
 * Mirrors the web's `updateWatchProgress` — same 90% auto-complete rule,
 * same XP award — so a learner who watches half a lesson on the phone
 * and finishes it on the laptop sees one continuous progress bar.
 *
 * The response carries the caller's new XP totals so the app can pop
 * the "+10 XP" toast without a second round trip.
 */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  let body: { lesson_id?: string; watched_sec?: number; completed?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonError('بيانات غير صالحة.');
  }

  const lessonId = String(body.lesson_id || '');
  const watchedSec = Number(body.watched_sec);
  if (!lessonId || !Number.isFinite(watchedSec) || watchedSec < 0) {
    return jsonError('بيانات غير صالحة.');
  }

  const service = createServiceClient();
  const { data: lesson } = await service
    .from('lessons')
    .select('id, course_id, is_free_preview, duration_sec')
    .eq('id', lessonId)
    .maybeSingle();

  if (!lesson) return jsonError('الدرس ده مش موجود.', 404, 'not_found');

  if (!lesson.is_free_preview) {
    const { subscribed, enrolled } = await canAccessCourse(user.id, lesson.course_id);
    if (!subscribed && !enrolled) {
      return jsonError('مش مسموح.', 403, 'forbidden');
    }
  }

  // Same rule as the web player: 90% watched counts as done. An explicit
  // `completed: true` from the app's "خلصت الدرس" button also counts.
  const shouldComplete =
    body.completed === true ||
    (lesson.duration_sec > 0 && watchedSec >= lesson.duration_sec * 0.9);

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

  let xpAwarded = 0;
  if (shouldComplete) {
    const before = await getUserXp(user.id);
    await awardLessonComplete(user.id, lesson.id, lesson.course_id);
    const after = await getUserXp(user.id);
    xpAwarded = Math.max(after.total_xp - before.total_xp, 0);
  }

  const xp = await getUserXp(user.id);
  const prog = levelProgress(xp.total_xp);

  return Response.json({
    ok: true,
    is_completed: shouldComplete,
    // 0 when the lesson had already been paid for — the app uses this
    // to decide whether to show the toast at all.
    xp_awarded: xpAwarded,
    xp: {
      total: xp.total_xp,
      level: prog.level,
      percent_to_next: prog.percent,
      current_streak: xp.current_streak,
    },
  });
}
