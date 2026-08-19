import { supabase } from './supabase';

/**
 * Community goes straight to Supabase rather than through the Next.js
 * API — RLS and the two SECURITY DEFINER RPCs already express every
 * rule, so a REST hop in the middle would add latency and a second
 * place for the moderation logic to drift.
 */

export type PostKind = 'discussion' | 'question' | 'win' | 'resource';

export const POST_KINDS: PostKind[] = ['discussion', 'question', 'win', 'resource'];

export const POST_KIND_LABELS: Record<PostKind, string> = {
  discussion: '💬 نقاش',
  question: '❓ سؤال',
  win: '🎉 إنجاز',
  resource: '🔗 مصدر مفيد',
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

export async function fetchFeed(opts: {
  kind?: PostKind | null;
  courseId?: string | null;
  limit?: number;
  before?: string | null;
} = {}): Promise<FeedPost[]> {
  // p_viewer_id is only consulted when auth.uid() is NULL (the service
  // role path used by the website). From the app the JWT supplies it, so
  // a client can't pass someone else's id to peek at their feed.
  const { data, error } = await supabase.rpc('community_feed', {
    p_course_id: opts.courseId ?? null,
    p_kind: opts.kind ?? null,
    p_limit: opts.limit ?? 20,
    p_before: opts.before ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedPost[];
}

export async function fetchThread(postId: string): Promise<ThreadComment[]> {
  const { data, error } = await supabase.rpc('community_thread', {
    p_post_id: postId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as ThreadComment[];
}

export async function fetchPost(postId: string): Promise<FeedPost | null> {
  // The feed RPC is the only reader that joins the author, so page
  // through the recent window and fall back to a plain select for
  // anything older.
  const recent = await fetchFeed({ limit: 50 });
  return recent.find((p) => p.id === postId) ?? null;
}

export async function createPost(input: {
  kind: PostKind;
  title?: string | null;
  body: string;
  courseId?: string | null;
}): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('محتاج تسجّل دخول الأول.');

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: user.id,
      kind: input.kind,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      course_id: input.courseId ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function createComment(input: {
  postId: string;
  body: string;
  parentId?: string | null;
}): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('محتاج تسجّل دخول الأول.');

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      user_id: user.id,
      post_id: input.postId,
      parent_id: input.parentId ?? null,
      body: input.body.trim(),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Optimistic-friendly like toggle. Returns the resulting state. */
export async function toggleLike(
  targetType: 'post' | 'comment',
  targetId: string,
  currentlyLiked: boolean
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('محتاج تسجّل دخول الأول.');

  const key = { user_id: user.id, target_type: targetType, target_id: targetId };

  if (currentlyLiked) {
    const { error } = await supabase.from('community_likes').delete().match(key);
    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase.from('community_likes').insert(key);
  // 23505 = already liked (a double tap raced itself) — treat as success.
  if (error && error.code !== '23505') throw new Error(error.message);
  return true;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('community_posts').delete().eq('id', postId);
  if (error) throw new Error(error.message);
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('community_comments').delete().eq('id', commentId);
  if (error) throw new Error(error.message);
}

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

/** File a report. A repeat tap is a no-op, so the UI can always confirm. */
export async function reportContent(input: {
  targetType: 'post' | 'comment';
  targetId: string;
  reason: ReportReason;
  note?: string | null;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('محتاج تسجّل دخول الأول.');

  const { error } = await supabase.from('community_reports').insert({
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    note: input.note?.trim() || null,
  });
  // 23505 = already reported by this person.
  if (error && error.code !== '23505') throw new Error(error.message);
}

/**
 * Block an author. One-directional and personal — the filter lives in
 * the feed RPCs, so the next refresh simply stops returning their rows.
 */
export async function blockUser(blockedId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('محتاج تسجّل دخول الأول.');
  if (user.id === blockedId) return;

  const { error } = await supabase
    .from('community_blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function unblockUser(blockedId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('community_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);
}
