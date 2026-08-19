import Link from 'next/link';
import { Heart, MessageCircle, Pin } from 'lucide-react';
import {
  POST_KIND_EMOJI,
  POST_KIND_LABELS,
  timeAgoAr,
  type FeedPost,
} from '@/lib/community';
import { toggleLikeAction } from './actions';

/**
 * One post in the feed. Kept as a Server Component — the only
 * interactive bit is the like button, and a Server Action form covers
 * that without shipping any JS to a 3G phone.
 */
export function PostCard({ post, href }: { post: FeedPost; href?: string }) {
  const target = href ?? `/community/${post.id}`;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 hover:border-brand-500/40 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <Avatar name={post.author_name} url={post.author_avatar} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
            <span className="font-bold text-gray-900 truncate max-w-[10rem]">
              {post.author_name}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-700 font-bold">
              Lv {post.author_level}
            </span>
            <span>•</span>
            <span>{timeAgoAr(post.created_at)}</span>
            {post.is_pinned && (
              <span className="inline-flex items-center gap-1 text-brand-600">
                <Pin className="w-3 h-3" /> مثبّت
              </span>
            )}
          </div>

          <Link href={target} className="block mt-2 group">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0 whitespace-nowrap">
                {POST_KIND_EMOJI[post.kind]} {POST_KIND_LABELS[post.kind]}
              </span>
              {post.course_title && (
                <span className="text-xs text-gray-400 truncate min-w-0">
                  {post.course_title}
                </span>
              )}
            </div>
            {post.title && (
              <h3 className="font-bold leading-snug group-hover:text-brand-600 transition-colors break-words">
                {post.title}
              </h3>
            )}
            <p className="text-sm text-gray-600 leading-relaxed mt-1 line-clamp-3 break-words whitespace-pre-wrap">
              {post.body}
            </p>
          </Link>

          <div className="flex items-center gap-4 mt-3 text-sm">
            <form action={toggleLikeAction}>
              <input type="hidden" name="target_type" value="post" />
              <input type="hidden" name="target_id" value={post.id} />
              <input type="hidden" name="post_id" value={post.id} />
              <button
                type="submit"
                className={`inline-flex items-center gap-1.5 transition-colors ${
                  post.liked_by_me
                    ? 'text-rose-600'
                    : 'text-gray-500 hover:text-rose-600'
                }`}
                aria-label={post.liked_by_me ? 'إلغاء الإعجاب' : 'إعجاب'}
              >
                <Heart
                  className={`w-4 h-4 ${post.liked_by_me ? 'fill-current' : ''}`}
                />
                {post.like_count > 0 && <span>{post.like_count}</span>}
              </button>
            </form>

            <Link
              href={target}
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-brand-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {post.comment_count > 0 ? post.comment_count : 'علّق'}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // Community avatars are user-supplied URLs from anywhere, so they
    // skip next/image (whose remotePatterns allowlist would reject
    // most of them) and render as a plain img.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 bg-gray-100"
      />
    );
  }
  return (
    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-500/15 text-brand-700 font-bold flex items-center justify-center flex-shrink-0">
      {name.trim().charAt(0) || 'ف'}
    </div>
  );
}
