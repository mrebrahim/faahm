import { createServiceClient } from '@/lib/supabase/server';
import { canAccessCourse } from '@/lib/access';
import { productForCourseSlug } from '@/lib/catalog';
import { getMobileUser, jsonError } from '@/lib/mobile-auth';
import { resolveVideoEmbed } from '@/lib/video';

export const dynamic = 'force-dynamic';

/**
 * Course detail + full outline + the caller's progress through it.
 *
 * Lesson rows never carry video ids here — playback credentials come
 * from /api/mobile/lesson/[id], which re-checks access. That keeps a
 * locked course's outline browsable (good for conversion) without
 * leaking a playable URL.
 */
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const user = await getMobileUser(request);
  const service = createServiceClient();

  const { data: course } = await service
    .from('courses')
    .select(
      `id, slug, title_ar, description_ar, short_description_ar, thumbnail_url,
       level, total_lessons, total_duration_sec, what_you_learn, requirements,
       rating_avg, rating_count, is_free, yearly_only, is_published,
       trailer_video_provider, trailer_video_id, trailer_video_library_id,
       instructors(full_name_ar, bio_ar, avatar_url)`
    )
    .eq('slug', params.slug)
    .maybeSingle();

  if (!course || !course.is_published) {
    return jsonError('الكورس ده مش موجود.', 404, 'not_found');
  }

  // Non-null for the courses sold on their own, so the app can print
  // the real price on the lock screen instead of an upsell that
  // wouldn't unlock it.
  const courseProduct = productForCourseSlug(course.slug);

  const [access, chaptersRes, progressRes] = await Promise.all([
    canAccessCourse(user?.id ?? null, course.id),
    service
      .from('chapters')
      .select('id, title_ar, sort_order, lessons(id, title_ar, duration_sec, sort_order, is_free_preview)')
      .eq('course_id', course.id)
      .order('sort_order'),
    user
      ? service
          .from('progress')
          .select('lesson_id, is_completed, watched_sec')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const progressByLesson = new Map<string, { is_completed: boolean; watched_sec: number }>();
  for (const p of progressRes.data ?? []) {
    progressByLesson.set(p.lesson_id, {
      is_completed: p.is_completed,
      watched_sec: p.watched_sec,
    });
  }

  const unlocked = access.subscribed || access.enrolled;

  const chapters = (chaptersRes.data ?? []).map((ch: any) => ({
    id: ch.id,
    title: ch.title_ar,
    lessons: (ch.lessons ?? [])
      .slice()
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((l: any) => {
        const p = progressByLesson.get(l.id);
        return {
          id: l.id,
          title: l.title_ar,
          duration_sec: l.duration_sec,
          is_free_preview: l.is_free_preview,
          playable: unlocked || l.is_free_preview,
          is_completed: p?.is_completed ?? false,
          watched_sec: p?.watched_sec ?? 0,
        };
      }),
  }));

  const totalLessons = chapters.reduce((n, c) => n + c.lessons.length, 0);
  const doneLessons = chapters.reduce(
    (n, c) => n + c.lessons.filter((l: { is_completed: boolean }) => l.is_completed).length,
    0
  );

  const instructor = Array.isArray(course.instructors)
    ? course.instructors[0]
    : course.instructors;

  // The trailer was being SELECTed and then dropped on the floor, so the
  // app had no way to show it. It's public marketing — no access check,
  // unlike lesson playback.
  const trailer = resolveVideoEmbed(
    course.trailer_video_provider,
    course.trailer_video_id,
    course.trailer_video_library_id,
    { tokenTtlSeconds: 3600 }
  );

  return Response.json({
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title_ar,
      description: course.description_ar,
      short_description: course.short_description_ar,
      thumbnail_url: course.thumbnail_url,
      level: course.level,
      total_lessons: course.total_lessons,
      total_duration_sec: course.total_duration_sec,
      what_you_learn: course.what_you_learn ?? [],
      requirements: course.requirements ?? [],
      rating_avg: Number(course.rating_avg) || 0,
      rating_count: course.rating_count,
      is_free: course.is_free,
      sold_separately: course.yearly_only === true,
      price_usd: courseProduct?.priceUsd ?? null,
      trailer: trailer ? { kind: trailer.kind, url: trailer.src } : null,
      instructor: instructor
        ? {
            name: instructor.full_name_ar,
            bio: instructor.bio_ar,
            avatar_url: instructor.avatar_url,
          }
        : null,
    },
    access: {
      unlocked,
      free: access.free,
      requires_purchase: access.requiresPurchase,
      lock_reason: unlocked
        ? null
        : access.requiresPurchase
          ? 'needs_purchase'
          : 'needs_subscription',
    },
    progress: {
      completed_lessons: doneLessons,
      total_lessons: totalLessons,
      percent: totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0,
    },
    chapters,
  });
}
