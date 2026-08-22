import { createServiceClient } from '@/lib/supabase/server';
import { getActiveSubscription } from '@/lib/access';
import { getMobileUser, unauthorized } from '@/lib/mobile-auth';
import { getUserXp, levelProgress } from '@/lib/xp';
import { canAccessCommunity } from '@/lib/community';

export const dynamic = 'force-dynamic';

/**
 * Everything the app's home screen needs in one round trip: who the
 * user is, what their plan unlocks, their XP standing, and whether
 * they're allowed to post in the community.
 *
 * One call instead of five matters here — the audience is on patchy 3G
 * and each extra request is another chance to hang.
 */
export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const service = createServiceClient();

  const [profileRes, sub, xp, canPost, doneRes, certRes] = await Promise.all([
    service
      .from('profiles')
      .select('full_name, avatar_url, phone, country, role')
      .eq('id', user.id)
      .maybeSingle(),
    getActiveSubscription(user.id),
    getUserXp(user.id),
    canAccessCommunity(user.id),
    service
      .from('progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_completed', true),
    service
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const profile = profileRes.data;
  const prog = levelProgress(xp.total_xp);

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      country: profile?.country ?? null,
      is_admin: profile?.role === 'admin' || profile?.role === 'moderator',
    },
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: !!sub.cancelled_at,
        }
      : null,
    // The app renders locks from these two flags rather than
    // re-implementing the gating rules client-side.
    access: {
      has_subscription: !!sub,
      unlocks_yearly_only: sub?.plan === 'yearly',
      // Yearly-plan benefit. The app renders a locked tab when false.
      can_post_community: canPost,
      can_use_community: canPost,
    },
    xp: {
      total: xp.total_xp,
      level: prog.level,
      percent_to_next: prog.percent,
      xp_to_next: prog.toNext,
      current_streak: xp.current_streak,
      longest_streak: xp.longest_streak,
    },
    stats: {
      completed_lessons: doneRes.count ?? 0,
      certificates: certRes.count ?? 0,
    },
  });
}
