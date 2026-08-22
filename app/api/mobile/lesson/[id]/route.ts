import { createServiceClient } from '@/lib/supabase/server';
import { canAccessCourse } from '@/lib/access';
import { getMobileUser, jsonError, unauthorized } from '@/lib/mobile-auth';
import { resolveVideoEmbed } from '@/lib/video';
import { getLessonQuestions } from '@/lib/lesson-questions';

export const dynamic = 'force-dynamic';

/**
 * Playback payload for one lesson.
 *
 * This is the only endpoint that hands out a video URL, and it re-runs
 * the full access check before doing so — never trust the `playable`
 * flag the outline endpoint returned, since that response sat on the
 * device and could have gone stale (or been tampered with).
 *
 * Bunny embeds are signed with a short-lived token when
 * BUNNY_TOKEN_KEY_<library> is configured, so a URL scraped off the
 * device expires within the hour instead of being a permanent leak.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getMobileUser(request);
  const service = createServiceClient();

  const { data: lesson } = await service
    .from('lessons')
    .select(
      `id, course_id, chapter_id, title_ar, description_ar, duration_sec,
       sort_order, is_free_preview, video_provider, video_id, video_library_id,
       captions_url,
       course:courses(id, slug, title_ar, is_published)`
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!lesson) return jsonError('الدرس ده مش موجود.', 404, 'not_found');

  const course = Array.isArray(lesson.course) ? lesson.course[0] : lesson.course;
  if (!course?.is_published) return jsonError('الدرس ده مش موجود.', 404, 'not_found');

  const access = await canAccessCourse(user?.id ?? null, lesson.course_id);
  const allowed = access.subscribed || access.enrolled || lesson.is_free_preview;

  if (!allowed) {
    if (!user) return unauthorized();
    return Response.json(
      {
        error: 'locked',
        lock_reason: access.requiresYearly ? 'needs_yearly' : 'needs_subscription',
        message: access.requiresYearly
          ? 'الكورس ده متاح في الباقة السنوية.'
          : 'محتاج اشتراك عشان تفتح الدرس ده.',
      },
      { status: 403 }
    );
  }

  const [{ data: progress }, { data: attachments }, siblings] = await Promise.all([
    user
      ? service
          .from('progress')
          .select('watched_sec, is_completed')
          .eq('user_id', user.id)
          .eq('lesson_id', lesson.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    service
      .from('lesson_attachments')
      .select('id, file_name_ar, file_url, file_size_kb, file_type')
      .eq('lesson_id', lesson.id),
    // The whole course outline, ordered, so we can hand back the
    // previous and next lesson. Without this the app can't offer a
    // "التالي" button and the learner has to back out to the course
    // page after every single lesson.
    service
      .from('lessons')
      .select('id, title_ar, sort_order, chapter_id, is_free_preview, chapters(sort_order)')
      .eq('course_id', lesson.course_id),
  ]);

  const ordered = (siblings.data ?? [])
    .map((l: any) => ({
      id: l.id,
      title: l.title_ar,
      is_free_preview: l.is_free_preview,
      chapterOrder: (Array.isArray(l.chapters) ? l.chapters[0] : l.chapters)?.sort_order ?? 0,
      lessonOrder: l.sort_order ?? 0,
    }))
    .sort((a, b) => a.chapterOrder - b.chapterOrder || a.lessonOrder - b.lessonOrder);

  const position = ordered.findIndex((l) => l.id === lesson.id);
  const neighbour = (offset: number) => {
    const item = position >= 0 ? ordered[position + offset] : undefined;
    if (!item) return null;
    return {
      id: item.id,
      title: item.title,
      // A locked next lesson still gets returned so the app can show it
      // greyed out rather than pretending the course ended.
      playable: allowed || item.is_free_preview,
    };
  };

  const embed = resolveVideoEmbed(
    lesson.video_provider,
    lesson.video_id,
    lesson.video_library_id,
    { start: progress?.watched_sec ?? 0, tokenTtlSeconds: 3600 }
  );

  return Response.json({
    lesson: {
      id: lesson.id,
      title: lesson.title_ar,
      description: lesson.description_ar,
      duration_sec: lesson.duration_sec,
      captions_url: lesson.captions_url,
      course: { id: course.id, slug: course.slug, title: course.title_ar },
    },
    playback: embed
      ? { kind: embed.kind, url: embed.src, expires_in_sec: 3600 }
      : null,
    progress: {
      watched_sec: progress?.watched_sec ?? 0,
      is_completed: progress?.is_completed ?? false,
    },
    nav: {
      index: position >= 0 ? position + 1 : null,
      total: ordered.length,
      previous: neighbour(-1),
      next: neighbour(1),
    },
    // Answered questions double as an FAQ on the lesson — one good
    // answer serves everyone who gets stuck in the same place.
    questions: await getLessonQuestions(lesson.id, user?.id ?? null),
    attachments: (attachments ?? []).map((a: any) => ({
      id: a.id,
      title: a.file_name_ar,
      url: a.file_url,
      size_kb: a.file_size_kb,
      file_type: a.file_type,
    })),
  });
}
