import { createServiceClient } from '@/lib/supabase/server';

export type SubscriptionRow = {
  id: string;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'paused' | 'trialing';
  current_period_end: string;
  cancelled_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
};

/**
 * Active = status 'active' or 'trialing' AND current_period_end in the future.
 * Mirrors the SQL `user_has_active_subscription` helper so we can use it in
 * Server Components without an extra round trip.
 */
export async function getActiveSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('subscriptions')
    .select(
      'id, plan, status, current_period_end, cancelled_at, stripe_subscription_id, stripe_customer_id'
    )
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as SubscriptionRow | null) ?? null;
}

export async function hasActiveSubscription(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const sub = await getActiveSubscription(userId);
  return !!sub;
}

/**
 * Per-course access grant. Admins can hand-pick a student and "enroll" them in
 * a single course; that grant overrides the normal subscription paywall for
 * that course only. Optional expires_at — null means permanent.
 */
export async function hasCourseEnrollment(
  userId: string | null | undefined,
  courseId: string | null | undefined
): Promise<boolean> {
  if (!userId || !courseId) return false;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('enrollments')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (!data) return false;
  if (data.expires_at && new Date(data.expires_at) <= new Date()) return false;
  return true;
}

/**
 * Resolves whether a user can play a lesson.
 *
 * A subscription normally covers the whole catalog, with one exception:
 * courses flagged `yearly_only` are reserved for the yearly plan. A
 * monthly subscriber hitting one of those falls through to the same
 * checks a non-subscriber gets — per-course enrollment (coupon / manual
 * grant), then the lesson's own free-preview flag at the call site.
 *
 * `requiresYearly` is returned so the paywall can say "ده كورس للباقة
 * السنوية" instead of the generic "اشترك" pitch to someone who is
 * already paying.
 */
export async function canAccessCourse(
  userId: string | null | undefined,
  courseId: string | null | undefined
): Promise<{
  subscribed: boolean;
  enrolled: boolean;
  requiresYearly: boolean;
  free: boolean;
}> {
  if (!userId || !courseId) {
    return { subscribed: false, enrolled: false, requiresYearly: false, free: false };
  }

  const [sub, gate] = await Promise.all([
    getActiveSubscription(userId),
    getCourseGate(courseId),
  ]);

  // Free (lead-magnet) courses open for anyone signed in. Checked before
  // the plan gate so a free course never asks a visitor to pay.
  if (gate.isFree) {
    return { subscribed: false, enrolled: true, requiresYearly: false, free: true };
  }

  const yearlyOnly = gate.yearlyOnly;

  // Yearly (or any future plan that isn't monthly) unlocks everything.
  const planCovers = !!sub && (!yearlyOnly || sub.plan === 'yearly');
  if (planCovers) {
    return { subscribed: true, enrolled: false, requiresYearly: false, free: false };
  }

  // Monthly subscriber blocked by the yearly gate — an explicit
  // per-course grant still lets them in.
  const enrolled = await hasCourseEnrollment(userId, courseId);
  return {
    subscribed: false,
    enrolled,
    requiresYearly: yearlyOnly && !!sub && !enrolled,
    free: false,
  };
}

/**
 * The two course-level gating flags in one round trip. Both default to
 * false on a lookup miss: a transient DB hiccup must not lock a paying
 * subscriber out of content (yearly_only) nor silently paywall a course
 * we advertised as free (is_free).
 */
export async function getCourseGate(
  courseId: string | null | undefined
): Promise<{ yearlyOnly: boolean; isFree: boolean }> {
  if (!courseId) return { yearlyOnly: false, isFree: false };
  const { data } = await createServiceClient()
    .from('courses')
    .select('yearly_only, is_free')
    .eq('id', courseId)
    .maybeSingle();
  return {
    yearlyOnly: data?.yearly_only === true,
    isFree: data?.is_free === true,
  };
}

/**
 * Whether a course is gated behind the yearly plan. Defaults to false on
 * a lookup miss so a transient DB hiccup can't lock a paying subscriber
 * out of content they should have.
 */
export async function isYearlyOnlyCourse(
  courseId: string | null | undefined
): Promise<boolean> {
  if (!courseId) return false;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('courses')
    .select('yearly_only')
    .eq('id', courseId)
    .maybeSingle();
  return data?.yearly_only === true;
}

