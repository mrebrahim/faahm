import { createServiceClient } from '@/lib/supabase/server';
import { getActiveSubscription } from '@/lib/access';
import { getMobileUser } from '@/lib/mobile-auth';
import { getUserXp, levelProgress } from '@/lib/xp';

export const dynamic = 'force-dynamic';

/**
 * Everything the app's home screen shows, in ONE request.
 *
 * The alternative — five calls fanning out from the client — means five
 * chances to hang on a 3G connection and a screen that assembles itself
 * in pieces. One round trip renders once.
 */
export async function GET(request: Request) {
  const user = await getMobileUser(request);
  const service = createServiceClient();

  const [sub, xp, coursesRes, postsRes, communityRes, continueRes] = await Promise.all([
    user ? getActiveSubscription(user.id) : Promise.resolve(null),
    user ? getUserXp(user.id) : Promise.resolve(null),
    service
      .from('courses')
      .select(
        'id, slug, title_ar, short_description_ar, thumbnail_url, total_lessons, total_duration_sec, is_free, yearly_only, rating_avg'
      )
      .eq('is_published', true)
      .order('is_free', { ascending: false })
      .order('sort_order')
      .limit(8),
    // News = the blog. Same content the website ranks on.
    service
      .from('blog_posts')
      .select('id, slug, title, excerpt, cover_image_url, published_at, reading_time_min')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(5),
    user
      ? service.rpc('community_feed', {
          p_course_id: null,
          p_kind: null,
          p_limit: 5,
          p_before: null,
          p_viewer_id: user.id,
          p_group_id: null,
        })
      : Promise.resolve({ data: [] }),
    // Resume where they stopped — the single most useful thing on a
    // learning app's home screen.
    user
      ? service
          .from('progress')
          .select('lesson_id, course_id, watched_sec, is_completed, last_watched_at')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .order('last_watched_at', { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] }),
  ]);

  // Resolve the in-progress lesson's titles, if there is one.
  let continueLesson: {
    lesson_id: string;
    lesson_title: string;
    course_slug: string;
    course_title: string;
  } | null = null;

  const inProgress = (continueRes.data ?? [])[0];
  if (inProgress) {
    const [{ data: lesson }, { data: course }] = await Promise.all([
      service.from('lessons').select('title_ar').eq('id', inProgress.lesson_id).maybeSingle(),
      service.from('courses').select('slug, title_ar').eq('id', inProgress.course_id).maybeSingle(),
    ]);
    if (lesson && course) {
      continueLesson = {
        lesson_id: inProgress.lesson_id,
        lesson_title: lesson.title_ar,
        course_slug: course.slug,
        course_title: course.title_ar,
      };
    }
  }

  const prog = xp ? levelProgress(xp.total_xp) : null;

  return Response.json({
    xp: xp
      ? {
          total: xp.total_xp,
          level: prog!.level,
          percent_to_next: prog!.percent,
          xp_to_next: prog!.toNext,
          current_streak: xp.current_streak,
        }
      : null,
    has_subscription: !!sub,
    continue_lesson: continueLesson,
    courses: (coursesRes.data ?? []).map((c: any) => ({
      id: c.id,
      slug: c.slug,
      title: c.title_ar,
      description: c.short_description_ar,
      thumbnail_url: c.thumbnail_url,
      total_lessons: c.total_lessons,
      total_duration_sec: c.total_duration_sec,
      is_free: c.is_free,
      yearly_only: c.yearly_only,
      rating_avg: Number(c.rating_avg) || 0,
      unlocked: c.is_free || (!!sub && (!c.yearly_only || sub.plan === 'yearly')),
      lock_reason: null,
    })),
    news: (postsRes.data ?? []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      cover_image_url: p.cover_image_url,
      published_at: p.published_at,
      reading_time_min: p.reading_time_min,
      url: `https://faahm.com/blog/${p.slug}`,
    })),
    community: ((communityRes as any).data ?? []).map((p: any) => ({
      id: p.id,
      author_name: p.author_name,
      kind: p.kind,
      title: p.title,
      body: p.body,
      comment_count: p.comment_count,
      like_count: p.like_count,
      group_name: p.group_name,
    })),
  });
}
