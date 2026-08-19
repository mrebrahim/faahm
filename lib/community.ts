import { createServiceClient } from '@/lib/supabase/server';
import { awardXp } from '@/lib/xp';

/**
 * Community data layer.
 *
 * Reads go through the `community_feed` / `community_thread` RPCs so the
 * author's display name can be joined without opening a read policy on
 * `profiles` (which is private — users_view_own_profile only). Writes go
 * through the service client after an explicit ownership/eligibility
 * check here, because Server Actions can't carry the user's JWT into
 * the RLS engine the way the mobile client does.
 *
 * The mobile app hits the same RPCs directly with the user's JWT, so RLS
 * is the real backstop on that path.
 */

export const POST_KINDS = ['discussion', 'question', 'win', 'resource'] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const POST_KIND_LABELS: Record<PostKind, string> = {
  discussion: 'نقاش',
  question: 'سؤال',
  win: 'إنجاز',
  resource: 'مصدر مفيد',
};

export const POST_KIND_EMOJI: Record<PostKind, string> = {
  discussion: '💬',
  question: '❓',
  win: '🎉',
  resource: '🔗',
};

export type FeedPost = {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  author_level: number;
  course_id: string | null;
  course_slug: string | null;
  course_title: string | null;
  kind: PostKind;
  title: string | null;
  body: string;
  is_pinned: boolean;
  is_locked: boolean;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
  last_activity_at: string;
  created_at: string;
};

export type ThreadComment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  author_level: number;
  body: string;
  like_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
  created_at: string;
};

/**
 * Posting is for signed-in learners with a real stake in the platform:
 * an active subscription, a course grant, or a free-course enrollment.
 * Reading is open to every signed-in user — a fresh lead who just
 * claimed a free course should see the room before they can talk in it,
 * and that asymmetry is what keeps the feed from filling with spam
 * accounts.
 */
export async function canPostToCommunity(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const service = createServiceClient();

  const [{ count: subs }, { count: grants }] = await Promise.all([
    service
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .gt('current_period_end', new Date().toISOString()),
    service
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  return (subs ?? 0) > 0 || (grants ?? 0) > 0;
}

export async function getFeed(opts: {
  viewerId: string | null;
  courseId?: string | null;
  kind?: PostKind | null;
  limit?: number;
  before?: string | null;
}): Promise<FeedPost[]> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('community_feed', {
    p_course_id: opts.courseId ?? null,
    p_kind: opts.kind ?? null,
    p_limit: opts.limit ?? 20,
    p_before: opts.before ?? null,
    // The service key means auth.uid() is NULL inside the function, so
    // the viewer has to be passed in — otherwise the block filter would
    // silently match nobody and blocked authors would still show up.
    p_viewer_id: opts.viewerId,
  });

  if (error) {
    console.error('[community] feed failed', error.message);
    return [];
  }

  // The RPC resolves liked_by_me / is_mine from auth.uid(), which is
  // NULL under the service key. Recompute both for the real viewer.
  return withLikes(
    decorate((data ?? []) as FeedPost[], opts.viewerId),
    opts.viewerId,
    'post'
  );
}

export async function getPost(postId: string, viewerId: string | null): Promise<FeedPost | null> {
  const service = createServiceClient();

  const { data: raw } = await service
    .from('community_posts')
    .select(
      `id, user_id, course_id, kind, title, body, is_pinned, is_locked, is_hidden,
       like_count, comment_count, last_activity_at, created_at,
       course:courses(slug, title_ar)`
    )
    .eq('id', postId)
    .maybeSingle();

  if (!raw) return null;
  // A hidden post stays visible to its own author so a moderation
  // action doesn't make their content silently vanish.
  if (raw.is_hidden && raw.user_id !== viewerId) return null;

  const [{ data: author }, { data: xp }] = await Promise.all([
    service.from('profiles').select('full_name, avatar_url').eq('id', raw.user_id).maybeSingle(),
    service.from('user_xp').select('level').eq('user_id', raw.user_id).maybeSingle(),
  ]);

  const course = Array.isArray(raw.course) ? raw.course[0] : raw.course;

  const post: FeedPost = {
    id: raw.id,
    user_id: raw.user_id,
    author_name: author?.full_name?.trim() || 'طالب في فاهم',
    author_avatar: author?.avatar_url ?? null,
    author_level: xp?.level ?? 1,
    course_id: raw.course_id,
    course_slug: course?.slug ?? null,
    course_title: course?.title_ar ?? null,
    kind: raw.kind as PostKind,
    title: raw.title,
    body: raw.body,
    is_pinned: raw.is_pinned,
    is_locked: raw.is_locked,
    like_count: raw.like_count,
    comment_count: raw.comment_count,
    liked_by_me: false,
    is_mine: raw.user_id === viewerId,
    last_activity_at: raw.last_activity_at,
    created_at: raw.created_at,
  };

  const [withLike] = await withLikes([post], viewerId, 'post');
  return withLike;
}

export async function getThread(
  postId: string,
  viewerId: string | null
): Promise<ThreadComment[]> {
  const { data, error } = await createServiceClient().rpc('community_thread', {
    p_post_id: postId,
    p_viewer_id: viewerId,
  });
  if (error) {
    console.error('[community] thread failed', error.message);
    return [];
  }
  return withLikes(
    decorate((data ?? []) as ThreadComment[], viewerId),
    viewerId,
    'comment'
  );
}

/**
 * Fill in the two viewer-relative flags the RPC couldn't compute under
 * the service key.
 */
async function likedIds(
  viewerId: string,
  targetType: 'post' | 'comment',
  ids: string[]
): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { data } = await createServiceClient()
    .from('community_likes')
    .select('target_id')
    .eq('user_id', viewerId)
    .eq('target_type', targetType)
    .in('target_id', ids);
  return new Set((data ?? []).map((r: { target_id: string }) => r.target_id));
}

// Ownership is a pure comparison; the like flags need a round trip, so
// they're resolved separately by `withLikes` below.
function decorate<T extends { id: string; user_id: string }>(
  rows: T[],
  viewerId: string | null
): T[] {
  if (!viewerId) {
    return rows.map((r) => ({ ...r, liked_by_me: false, is_mine: false }));
  }
  return rows.map((r) => ({ ...r, is_mine: r.user_id === viewerId }));
}

/** Second pass that resolves liked_by_me for a rendered list. */
export async function withLikes<T extends { id: string }>(
  rows: T[],
  viewerId: string | null,
  targetType: 'post' | 'comment'
): Promise<T[]> {
  if (!viewerId || !rows.length) return rows;
  const liked = await likedIds(
    viewerId,
    targetType,
    rows.map((r) => r.id)
  );
  return rows.map((r) => ({ ...r, liked_by_me: liked.has(r.id) }));
}

export async function createPost(opts: {
  userId: string;
  kind: PostKind;
  title: string | null;
  body: string;
  courseId?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const body = opts.body.trim();
  if (body.length < 2) return { error: 'اكتب حاجة الأول 🙂' };
  if (body.length > 8000) return { error: 'البوست طويل أوي — قصّره شوية.' };

  const service = createServiceClient();
  const { data, error } = await service
    .from('community_posts')
    .insert({
      user_id: opts.userId,
      kind: opts.kind,
      title: opts.title?.trim() || null,
      body,
      course_id: opts.courseId || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[community] createPost failed', error?.message);
    return { error: 'مش قادرين نحفظ البوست دلوقتي. جرّب تاني.' };
  }

  // XP is keyed on the post id, so editing a post never re-pays.
  await awardXp({
    userId: opts.userId,
    kind: 'community_post',
    refKey: `post:${data.id}`,
    courseId: opts.courseId || null,
  });

  return { id: data.id };
}

export async function createComment(opts: {
  userId: string;
  postId: string;
  body: string;
  parentId?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const body = opts.body.trim();
  if (body.length < 1) return { error: 'اكتب تعليقك الأول.' };
  if (body.length > 4000) return { error: 'التعليق طويل أوي.' };

  const service = createServiceClient();

  const { data: post } = await service
    .from('community_posts')
    .select('id, is_locked, is_hidden, course_id')
    .eq('id', opts.postId)
    .maybeSingle();
  if (!post || post.is_hidden) return { error: 'البوست ده مش موجود.' };
  if (post.is_locked) return { error: 'البوست ده مقفول للتعليقات.' };

  // Threading is capped at one level: a reply to a reply attaches to
  // the same top-level comment so the UI never nests past depth 2.
  let parentId = opts.parentId || null;
  if (parentId) {
    const { data: parent } = await service
      .from('community_comments')
      .select('id, parent_id, post_id')
      .eq('id', parentId)
      .maybeSingle();
    if (!parent || parent.post_id !== opts.postId) parentId = null;
    else parentId = parent.parent_id ?? parent.id;
  }

  const { data, error } = await service
    .from('community_comments')
    .insert({
      user_id: opts.userId,
      post_id: opts.postId,
      parent_id: parentId,
      body,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[community] createComment failed', error?.message);
    return { error: 'مش قادرين نحفظ التعليق دلوقتي.' };
  }

  await awardXp({
    userId: opts.userId,
    kind: 'community_comment',
    refKey: `comment:${data.id}`,
    courseId: post.course_id || null,
  });

  return { id: data.id };
}

/** Idempotent like/unlike. Returns the new state. */
export async function toggleLike(opts: {
  userId: string;
  targetType: 'post' | 'comment';
  targetId: string;
}): Promise<{ liked: boolean }> {
  const service = createServiceClient();
  const key = {
    user_id: opts.userId,
    target_type: opts.targetType,
    target_id: opts.targetId,
  };

  const { data: existing } = await service
    .from('community_likes')
    .select('user_id')
    .match(key)
    .maybeSingle();

  if (existing) {
    await service.from('community_likes').delete().match(key);
    return { liked: false };
  }

  await service.from('community_likes').insert(key);
  return { liked: true };
}

/**
 * Author-initiated delete. Scoped by user_id in the WHERE clause so a
 * forged post id can only ever delete the caller's own row.
 */
export async function deleteOwnPost(userId: string, postId: string): Promise<void> {
  await createServiceClient()
    .from('community_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);
}

export async function deleteOwnComment(userId: string, commentId: string): Promise<void> {
  await createServiceClient()
    .from('community_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);
}

/** Relative Arabic timestamp — "من ٥ دقايق", "امبارح". */
export function timeAgoAr(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'دلوقتي';
  if (min < 60) return `من ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `من ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'امبارح';
  if (day < 30) return `من ${day} يوم`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `من ${mon} شهر`;
  return `من ${Math.floor(mon / 12)} سنة`;
}

// ---------------- moderation (App Store guideline 1.2) ----------------

export const REPORT_REASONS = [
  'spam',
  'harassment',
  'hate',
  'sexual',
  'violence',
  'misinformation',
  'off_topic',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: 'سبام أو إعلانات',
  harassment: 'تنمّر أو إساءة',
  hate: 'كراهية أو عنصرية',
  sexual: 'محتوى جنسي',
  violence: 'عنف أو تهديد',
  misinformation: 'معلومات مغلوطة',
  off_topic: 'خارج الموضوع',
  other: 'سبب تاني',
};

/**
 * File a report. Idempotent per (reporter, target) via a unique index —
 * a second tap is a no-op rather than an error, so the UI can always
 * say "وصلنا بلاغك".
 */
export async function reportContent(opts: {
  reporterId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reason: ReportReason;
  note?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const { error } = await createServiceClient().from('community_reports').insert({
    reporter_id: opts.reporterId,
    target_type: opts.targetType,
    target_id: opts.targetId,
    reason: opts.reason,
    note: opts.note?.trim() || null,
  });

  // 23505 = already reported by this person.
  if (error && error.code !== '23505') {
    console.error('[community] report failed', error.message);
    return { error: 'مقدرناش نسجّل البلاغ دلوقتي.' };
  }
  return { ok: true };
}

/**
 * Block a user. One-directional and personal — it only changes what the
 * blocker sees. The filter lives inside the feed RPCs so every client
 * honours it without reimplementing anything.
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (!blockerId || !blockedId || blockerId === blockedId) return;
  const { error } = await createServiceClient()
    .from('community_blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && error.code !== '23505') {
    console.error('[community] block failed', error.message);
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await createServiceClient()
    .from('community_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
}

export async function listBlockedUsers(blockerId: string): Promise<string[]> {
  const { data } = await createServiceClient()
    .from('community_blocks')
    .select('blocked_id')
    .eq('blocker_id', blockerId);
  return (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
}
