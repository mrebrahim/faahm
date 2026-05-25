import { createServiceClient } from '@/lib/supabase/server';

/**
 * For a given user, return the set of course ids where:
 *   - the user has completed every lesson, AND
 *   - the user has passed every attached quiz at >= 70%, AND
 *   - no active (non-revoked) certificate exists yet.
 *
 * Used to show the "اطلب شهادتك" prompts on /dashboard, /course/[slug],
 * and /certificates. We call the SQL function so the rules stay in one
 * place (it's the same predicate the trigger used to use).
 */
export async function listClaimableCourseIds(userId: string): Promise<string[]> {
  const service = createServiceClient();

  // Candidate courses: any course where the user has at least one
  // completed lesson. Cheap pre-filter so the eligibility function
  // isn't called for every published course on the site.
  const { data: rows } = await service
    .from('progress')
    .select('course_id')
    .eq('user_id', userId)
    .eq('is_completed', true);

  const candidateIds = Array.from(new Set((rows || []).map((r: any) => r.course_id))).filter(
    Boolean
  ) as string[];
  if (candidateIds.length === 0) return [];

  // Exclude courses that already have an active cert.
  const { data: existing } = await service
    .from('certificates')
    .select('course_id')
    .eq('user_id', userId)
    .eq('is_revoked', false)
    .in('course_id', candidateIds);
  const alreadyCertified = new Set((existing || []).map((r: any) => r.course_id));

  const todo = candidateIds.filter((id) => !alreadyCertified.has(id));
  if (todo.length === 0) return [];

  // Resolve eligibility in parallel via the SQL function.
  const checks = await Promise.all(
    todo.map(async (courseId) => {
      const { data, error } = await service.rpc('check_certificate_eligibility', {
        p_user_id: userId,
        p_course_id: courseId,
      });
      if (error) return null;
      return data ? courseId : null;
    })
  );
  return checks.filter((id): id is string => id !== null);
}
