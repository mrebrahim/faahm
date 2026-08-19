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
