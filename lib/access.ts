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

export type CourseAccess = {
  subscribed: boolean;
  enrolled: boolean;
  /** The course is sold on its own and this user hasn't bought it. */
  requiresPurchase: boolean;
  free: boolean;
  /** True for n8n / AI Video / Vibe Coding — no plan covers these. */
  soldSeparately: boolean;
  /** Course slug, so a paywall can look up the standalone price. */
  slug: string | null;
};

/**
 * Resolves whether a user can play a lesson.
 *
 * A subscription covers the general catalogue. It does NOT cover the
 * three courses flagged `yearly_only` (n8n, AI Video, Vibe Coding) —
 * those are bought once at $60, or together in the $99 bundle, and the
 * purchase lands as an `enrollments` row. See lib/catalog.ts for why
 * they sit outside the plan.
 *
 * `requiresPurchase` is returned so the paywall can offer the actual
 * price instead of pitching a subscription that would not unlock the
 * page the visitor is standing on.
 */
export async function canAccessCourse(
  userId: string | null | undefined,
  courseId: string | null | undefined
): Promise<CourseAccess> {
  const locked: CourseAccess = {
    subscribed: false,
    enrolled: false,
    requiresPurchase: false,
    free: false,
    soldSeparately: false,
    slug: null,
  };

  if (!courseId) return locked;

  // The gate is course-level, so it resolves even for a signed-out
  // visitor — the paywall needs to know the price to show them.
  if (!userId) {
    const gate = await getCourseGate(courseId);
    return {
      ...locked,
      soldSeparately: gate.soldSeparately,
      slug: gate.slug,
      requiresPurchase: gate.soldSeparately && !gate.isFree,
    };
  }

  const [sub, gate] = await Promise.all([
    getActiveSubscription(userId),
    getCourseGate(courseId),
  ]);

  // Free (lead-magnet) courses open for anyone signed in. Checked before
  // every paid gate so a free course never asks a visitor to pay.
  if (gate.isFree) {
    return {
      ...locked,
      enrolled: true,
      free: true,
      slug: gate.slug,
    };
  }

  // Sold-separately courses ignore the subscription entirely. The only
  // key is an enrollment row — written by a purchase, a coupon redeem,
  // an admin grant, or the grandfather backfill for subscribers who
  // already had access when this pricing shipped.
  if (gate.soldSeparately) {
    const enrolled = await hasCourseEnrollment(userId, courseId);
    return {
      ...locked,
      enrolled,
      soldSeparately: true,
      slug: gate.slug,
      requiresPurchase: !enrolled,
    };
  }

  // Everything else: any live plan opens it.
  if (sub) {
    return { ...locked, subscribed: true, slug: gate.slug };
  }

  const enrolled = await hasCourseEnrollment(userId, courseId);
  return { ...locked, enrolled, slug: gate.slug };
}

/**
 * The course-level gating flags in one round trip. Both booleans default
 * to false on a lookup miss: a transient DB hiccup must not paywall a
 * course we advertised as free (is_free), nor push a subscriber at a
 * purchase page for a course their plan already covers (yearly_only).
 */
export async function getCourseGate(
  courseId: string | null | undefined
): Promise<{ soldSeparately: boolean; isFree: boolean; slug: string | null }> {
  if (!courseId) return { soldSeparately: false, isFree: false, slug: null };
  const { data } = await createServiceClient()
    .from('courses')
    // `yearly_only` is the legacy column name for "sold separately".
    .select('yearly_only, is_free, slug')
    .eq('id', courseId)
    .maybeSingle();
  return {
    soldSeparately: data?.yearly_only === true,
    isFree: data?.is_free === true,
    slug: data?.slug ?? null,
  };
}

/**
 * Whether a course is sold on its own rather than covered by a plan.
 * Defaults to false on a lookup miss so a transient DB hiccup can't
 * paywall content a subscriber should have.
 */
export async function isSoldSeparately(
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

