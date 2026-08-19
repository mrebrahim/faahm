import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/lib/constants';
import {
  POST_KIND_EMOJI,
  POST_KIND_LABELS,
  canPostToCommunity,
  getPost,
  getThread,
  timeAgoAr,
} from '@/lib/community';
import { Avatar } from '../post-card';
import {
  createCommentAction,
  deleteCommentAction,
  deletePostAction,
  toggleLikeAction,
} from '../actions';
import { AlertCircle, ArrowRight, Heart, Lock, Trash2 } from 'lucide-react';

export const metadata = {
  title: `الكوميونيتي — ${APP_NAME}`,
};

export const dynamic = 'force-dynamic';

export default async function PostPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) redirect(`/login?redirect=/community/${params.id}`);

  const post = await getPost(params.id, user.id);
  if (!post) notFound();

  const [comments, canPost] = await Promise.all([
    getThread(post.id, user.id),
    canPostToCommunity(user.id),
  ]);

  const roots = comments.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, typeof comments>();
  for (const c of comments) {
    if (!c.parent_id) continue;
    const arr = repliesByParent.get(c.parent_id) || [];
    arr.push(c);
    repliesByParent.set(c.parent_id, arr);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-3xl">
        <Link
          href="/community"
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:no-underline mb-4"
        >
          <ArrowRight className="w-4 h-4" />
          رجوع للكوميونيتي
        </Link>

        {searchParams.error && (
          <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="leading-relaxed">{searchParams.error}</div>
          </div>
        )}

        <article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar name={post.author_name} url={post.author_avatar} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                <span className="font-bold text-gray-900 truncate max-w-[10rem]">
                  {post.author_name}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-700 font-bold">
                  Lv {post.author_level}
                </span>
                <span>•</span>
                <span>{timeAgoAr(post.created_at)}</span>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                  {POST_KIND_EMOJI[post.kind]} {POST_KIND_LABELS[post.kind]}
                </span>
                {post.course_slug && post.course_title && (
                  <Link
                    href={`/course/${post.course_slug}`}
                    className="text-xs text-brand-600 truncate min-w-0 hover:underline"
                  >
                    {post.course_title}
                  </Link>
                )}
              </div>

              {post.title && (
                <h1 className="font-display text-xl sm:text-2xl font-extrabold mt-2 leading-snug break-words">
                  {post.title}
                </h1>
              )}
              <div className="text-sm sm:text-base text-gray-700 leading-relaxed mt-3 whitespace-pre-wrap break-words">
                {post.body}
              </div>

              <div className="flex items-center gap-4 mt-4">
                <LikeButton
                  targetType="post"
                  targetId={post.id}
                  postId={post.id}
                  liked={post.liked_by_me}
                  count={post.like_count}
                />
                {post.is_mine && (
                  <form action={deletePostAction}>
                    <input type="hidden" name="post_id" value={post.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </article>

        <h2 className="font-bold mt-8 mb-3 text-sm text-gray-600">
          {post.comment_count > 0 ? `${post.comment_count} تعليق` : 'التعليقات'}
        </h2>

        <div className="space-y-3">
          {roots.map((c) => (
            <div key={c.id} id={`c-${c.id}`} className="space-y-3">
              <CommentRow comment={c} postId={post.id} canReply={canPost && !post.is_locked} />
              {(repliesByParent.get(c.id) || []).map((r) => (
                <div key={r.id} id={`c-${r.id}`} className="ms-6 sm:ms-12">
                  <CommentRow comment={r} postId={post.id} canReply={false} />
                </div>
              ))}
            </div>
          ))}

          {roots.length === 0 && (
            <p className="text-sm text-gray-500 py-4">
              مفيش تعليقات لسه. قول رأيك 👇
            </p>
          )}
        </div>

        {post.is_locked ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-500 rounded-xl border border-gray-200 bg-white p-4">
            <Lock className="w-4 h-4" />
            البوست ده مقفول للتعليقات.
          </div>
        ) : canPost ? (
          <form
            action={createCommentAction}
            className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 space-y-3"
          >
            <input type="hidden" name="post_id" value={post.id} />
            <textarea
              name="body"
              required
              rows={3}
              maxLength={4000}
              placeholder="اكتب تعليقك…"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-y"
            />
            <Button type="submit" className="w-full sm:w-auto">
              علّق
            </Button>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 text-sm leading-relaxed">
            التعليق لطلبة فاهم.{' '}
            <Link href="/courses?free=1" className="text-brand-600 underline">
              ابدأ كورس مجاني
            </Link>{' '}
            وهتقدر تشارك.
          </div>
        )}
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  postId,
  canReply,
}: {
  comment: Awaited<ReturnType<typeof getThread>>[number];
  postId: string;
  canReply: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3 min-w-0">
        <Avatar name={comment.author_name} url={comment.author_avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
            <span className="font-bold text-gray-900 truncate max-w-[10rem]">
              {comment.author_name}
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-700 font-bold">
              Lv {comment.author_level}
            </span>
            <span>•</span>
            <span>{timeAgoAr(comment.created_at)}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mt-2 whitespace-pre-wrap break-words">
            {comment.body}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <LikeButton
              targetType="comment"
              targetId={comment.id}
              postId={postId}
              liked={comment.liked_by_me}
              count={comment.like_count}
            />
            {comment.is_mine && (
              <form action={deleteCommentAction}>
                <input type="hidden" name="comment_id" value={comment.id} />
                <input type="hidden" name="post_id" value={postId} />
                <button
                  type="submit"
                  className="text-xs text-gray-400 hover:text-destructive transition-colors"
                >
                  حذف
                </button>
              </form>
            )}
          </div>

          {canReply && (
            <details className="mt-3">
              <summary className="text-xs text-brand-600 cursor-pointer list-none">
                رد على التعليق ده
              </summary>
              <form action={createCommentAction} className="mt-2 space-y-2">
                <input type="hidden" name="post_id" value={postId} />
                <input type="hidden" name="parent_id" value={comment.id} />
                <textarea
                  name="body"
                  required
                  rows={2}
                  maxLength={4000}
                  placeholder="ردّك…"
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
                <Button type="submit" size="sm" className="w-full sm:w-auto">
                  ابعت
                </Button>
              </form>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function LikeButton({
  targetType,
  targetId,
  postId,
  liked,
  count,
}: {
  targetType: 'post' | 'comment';
  targetId: string;
  postId: string;
  liked: boolean;
  count: number;
}) {
  return (
    <form action={toggleLikeAction}>
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <input type="hidden" name="post_id" value={postId} />
      <button
        type="submit"
        aria-label={liked ? 'إلغاء الإعجاب' : 'إعجاب'}
        className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
          liked ? 'text-rose-600' : 'text-gray-500 hover:text-rose-600'
        }`}
      >
        <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        {count > 0 && <span>{count}</span>}
      </button>
    </form>
  );
}
