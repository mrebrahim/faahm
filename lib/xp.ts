import { createServiceClient } from '@/lib/supabase/server';

/**
 * XP engine.
 *
 * Every award goes through `awardXp()`, which writes an `xp_events` row.
 * The DB trigger (`apply_xp_event`) folds that row into `user_xp` —
 * totals, level, and streak. Nothing writes `user_xp` directly.
 *
 * `(user_id, kind, ref_key)` is UNIQUE, so re-running an award is a
 * no-op instead of a double payment. That matters here: the lesson
 * player fires `updateWatchProgress` every ~15s and each call can flip
 * `is_completed`, so the same lesson genuinely tries to pay out many
 * times.
 */

export const XP_VALUES = {
  lesson_complete: 10,
  quiz_pass: 50,
  /** Bonus ON TOP of quiz_pass when the score is 100%. */
  quiz_perfect: 25,
  course_complete: 200,
  /** Awarded once per Cairo-day on any learning activity. */
  streak_day: 5,
  community_post: 15,
  community_comment: 5,
} as const;

export type XpKind = keyof typeof XP_VALUES | 'manual';

export type UserXp = {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_active_on: string | null;
};

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  current_streak: number;
  is_me: boolean;
};

/** Arabic labels for the activity feed on /dashboard/xp. */
export const XP_KIND_LABELS: Record<string, string> = {
  lesson_complete: 'خلّصت درس',
  quiz_pass: 'نجحت في امتحان',
  quiz_perfect: 'درجة كاملة في امتحان',
  course_complete: 'خلّصت كورس كامل',
  streak_day: 'يوم جديد في السلسلة',
  community_post: 'شاركت بوست في الكوميونيتي',
  community_comment: 'شاركت بتعليق',
  manual: 'نقاط من الإدارة',
};

/**
 * XP needed to reach a level, inverse of the SQL `xp_level_for`:
 *   level = 1 + floor(sqrt(total / 50))  →  total = 50 * (level - 1)^2
 */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 50 * (l - 1) ** 2;
}

export function levelForXp(totalXp: number): number {
  return Math.max(1, 1 + Math.floor(Math.sqrt(Math.max(totalXp, 0) / 50)));
}

/** Progress toward the next level, for the dashboard bar. */
export function levelProgress(totalXp: number): {
  level: number;
  intoLevel: number;
  levelSpan: number;
  toNext: number;
  percent: number;
} {
  const level = levelForXp(totalXp);
  const floorXp = xpForLevel(level);
  const nextXp = xpForLevel(level + 1);
  const levelSpan = Math.max(nextXp - floorXp, 1);
  const intoLevel = Math.max(totalXp - floorXp, 0);
  return {
    level,
    intoLevel,
    levelSpan,
    toNext: Math.max(nextXp - totalXp, 0),
    percent: Math.min(100, Math.round((intoLevel / levelSpan) * 100)),
  };
}

function cairoDateKey(d: Date = new Date()): string {
  // en-CA gives YYYY-MM-DD, which sorts and compares as a plain string.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Record one XP award. Idempotent on (userId, kind, refKey).
 *
 * Returns true when a NEW event landed, false when it was a duplicate or
 * the write failed — callers use that to decide whether to show the
 * "+10 XP" toast. Never throws: XP is a garnish on top of the real
 * action (completing a lesson), and a points hiccup must not fail the
 * completion itself.
 */
export async function awardXp(opts: {
  userId: string;
  kind: XpKind;
  refKey: string;
  points?: number;
  courseId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const { userId, kind, refKey, courseId, metadata } = opts;
  if (!userId || !refKey) return false;

  const points =
    opts.points ?? (kind === 'manual' ? 0 : XP_VALUES[kind as keyof typeof XP_VALUES]);
  if (!points) return false;

  const service = createServiceClient();
  const { error } = await service.from('xp_events').insert({
    user_id: userId,
    kind,
    points,
    ref_key: refKey,
    course_id: courseId ?? null,
    metadata: metadata ?? {},
  });

  // 23505 = unique_violation — already awarded, which is the expected
  // outcome most of the time. Anything else is worth a log line.
  if (error) {
    if (error.code !== '23505') {
      console.error('[xp] award failed', { kind, refKey, error: error.message });
    }
    return false;
  }
  return true;
}

/**
 * The daily streak bonus. Safe to call on every learning action — the
 * ref_key is the Cairo date, so only the first call each day pays.
 */
export async function awardDailyStreak(userId: string): Promise<boolean> {
  return awardXp({
    userId,
    kind: 'streak_day',
    refKey: `day:${cairoDateKey()}`,
  });
}

/**
 * Award for finishing a lesson, plus the daily streak, plus the course
 * completion bonus if this was the last lesson standing.
 */
export async function awardLessonComplete(
  userId: string,
  lessonId: string,
  courseId: string
): Promise<void> {
  const fresh = await awardXp({
    userId,
    kind: 'lesson_complete',
    refKey: `lesson:${lessonId}`,
    courseId,
  });

  // Only chase the streak and the course-completion check when this
  // lesson actually paid out — otherwise every 15s heartbeat on an
  // already-finished lesson would run two extra queries.
  if (!fresh) return;

  await awardDailyStreak(userId);
  await maybeAwardCourseComplete(userId, courseId);
}

/**
 * Course-completion bonus. Fires once, when the user's completed-lesson
 * count for a course reaches the course's published lesson count.
 */
export async function maybeAwardCourseComplete(
  userId: string,
  courseId: string
): Promise<boolean> {
  if (!userId || !courseId) return false;
  const service = createServiceClient();

  const [{ count: totalLessons }, { count: doneLessons }] = await Promise.all([
    service
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId),
    service
      .from('progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('is_completed', true),
  ]);

  if (!totalLessons || !doneLessons || doneLessons < totalLessons) return false;

  return awardXp({
    userId,
    kind: 'course_complete',
    refKey: `course:${courseId}`,
    courseId,
  });
}

/**
 * Award for a quiz attempt. Only a PASSING attempt pays, and only once
 * per quiz no matter how many attempts it took — the ref_key is keyed
 * on the quiz, not the attempt.
 */
export async function awardQuizResult(opts: {
  userId: string;
  quizId: string;
  courseId: string | null;
  score: number;
  isPassed: boolean;
}): Promise<void> {
  const { userId, quizId, courseId, score, isPassed } = opts;
  if (!isPassed) return;

  const fresh = await awardXp({
    userId,
    kind: 'quiz_pass',
    refKey: `quiz:${quizId}`,
    courseId,
    metadata: { score },
  });

  if (score >= 100) {
    await awardXp({
      userId,
      kind: 'quiz_perfect',
      refKey: `quiz:${quizId}`,
      courseId,
      metadata: { score },
    });
  }

  if (fresh) await awardDailyStreak(userId);
}

/** Current totals for a user. Returns zeros rather than null so the UI never branches. */
export async function getUserXp(userId: string | null | undefined): Promise<UserXp> {
  const empty: UserXp = {
    total_xp: 0,
    level: 1,
    current_streak: 0,
    longest_streak: 0,
    last_active_on: null,
  };
  if (!userId) return empty;

  const { data } = await createServiceClient()
    .from('user_xp')
    .select('total_xp, level, current_streak, longest_streak, last_active_on')
    .eq('user_id', userId)
    .maybeSingle();

  return (data as UserXp | null) ?? empty;
}

/** Recent ledger entries for the activity feed. */
export async function getXpHistory(userId: string, limit = 25) {
  const { data } = await createServiceClient()
    .from('xp_events')
    .select('id, kind, points, ref_key, course_id, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  const { data, error } = await createServiceClient().rpc('xp_leaderboard', {
    p_limit: limit,
  });
  if (error) {
    console.error('[xp] leaderboard failed', error.message);
    return [];
  }
  return (data ?? []) as LeaderboardRow[];
}
