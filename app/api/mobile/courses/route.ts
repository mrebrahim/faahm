import { createServiceClient } from '@/lib/supabase/server';
import { getActiveSubscription } from '@/lib/access';
import { getMobileUser } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

/**
 * Catalog for the app. Unauthenticated callers get the browse view
 * (everything locked except free courses) so the app can show a real
 * catalog on the signed-out onboarding screen — that's the whole point
 * of the free-course funnel.
 *
 * `?free=1` narrows to the lead magnets.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const freeOnly = url.searchParams.get('free') === '1';
  const user = await getMobileUser(request);

  const service = createServiceClient();

  let query = service
    .from('courses')
    .select(
      `id, slug, title_ar, short_description_ar, thumbnail_url, level,
       total_lessons, total_duration_sec, rating_avg, rating_count,
       is_free, yearly_only, category_id,
       instructors(full_name_ar)`
    )
    .eq('is_published', true);

  if (freeOnly) query = query.eq('is_free', true);

  const [{ data: courses }, sub, enrolledIds] = await Promise.all([
    query
      .order('is_free', { ascending: false })
      .order('sort_order')
      .order('created_at', { ascending: false }),
    user ? getActiveSubscription(user.id) : Promise.resolve(null),
    user ? enrolledCourseIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const rows = (courses ?? []).map((c: any) => {
    const instructor = Array.isArray(c.instructors) ? c.instructors[0] : c.instructors;
    const planCovers = !!sub && (!c.yearly_only || sub.plan === 'yearly');
    const unlocked = c.is_free || planCovers || enrolledIds.has(c.id);

    return {
      id: c.id,
      slug: c.slug,
      title: c.title_ar,
      description: c.short_description_ar,
      thumbnail_url: c.thumbnail_url,
      level: c.level,
      total_lessons: c.total_lessons,
      total_duration_sec: c.total_duration_sec,
      rating_avg: Number(c.rating_avg) || 0,
      rating_count: c.rating_count,
      instructor: instructor?.full_name_ar ?? null,
      is_free: c.is_free,
      yearly_only: c.yearly_only,
      unlocked,
      // Why it's locked, so the app can show the right CTA instead of a
      // generic "اشترك" on a course the user is one upgrade away from.
      lock_reason: unlocked
        ? null
        : c.yearly_only && sub
          ? 'needs_yearly'
          : 'needs_subscription',
    };
  });

  return Response.json({ courses: rows, count: rows.length });
}

async function enrolledCourseIds(userId: string): Promise<Set<string>> {
  const { data } = await createServiceClient()
    .from('enrollments')
    .select('course_id, expires_at')
    .eq('user_id', userId);

  const now = Date.now();
  return new Set(
    (data ?? [])
      .filter((e: any) => !e.expires_at || new Date(e.expires_at).getTime() > now)
      .map((e: any) => e.course_id as string)
  );
}
