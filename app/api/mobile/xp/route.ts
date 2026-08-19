import { getMobileUser, unauthorized } from '@/lib/mobile-auth';
import {
  XP_KIND_LABELS,
  XP_VALUES,
  getLeaderboard,
  getUserXp,
  getXpHistory,
  levelProgress,
} from '@/lib/xp';

export const dynamic = 'force-dynamic';

/**
 * The app's XP screen: totals, the recent ledger, and the leaderboard —
 * plus the point values themselves so the "ازاي أجمع نقاط؟" panel stays
 * in sync with the server without an app release.
 */
export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const [xp, history, leaders] = await Promise.all([
    getUserXp(user.id),
    getXpHistory(user.id, 30),
    getLeaderboard(50),
  ]);

  const prog = levelProgress(xp.total_xp);
  const myRank = leaders.findIndex((r) => r.user_id === user.id);

  return Response.json({
    xp: {
      total: xp.total_xp,
      level: prog.level,
      xp_into_level: prog.intoLevel,
      xp_for_level: prog.levelSpan,
      xp_to_next: prog.toNext,
      percent_to_next: prog.percent,
      current_streak: xp.current_streak,
      longest_streak: xp.longest_streak,
      // -1 when the user isn't in the returned slice.
      rank: myRank >= 0 ? myRank + 1 : -1,
    },
    history: history.map((e: any) => ({
      id: e.id,
      kind: e.kind,
      label: XP_KIND_LABELS[e.kind] ?? e.kind,
      points: e.points,
      course_id: e.course_id,
      created_at: e.created_at,
    })),
    leaderboard: leaders.map((r) => ({
      rank: r.rank,
      user_id: r.user_id,
      name: r.full_name,
      avatar_url: r.avatar_url,
      total_xp: r.total_xp,
      level: r.level,
      streak: r.current_streak,
      is_me: r.user_id === user.id,
    })),
    rules: XP_VALUES,
  });
}
