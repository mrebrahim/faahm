'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  POST_KINDS,
  REPORT_REASONS,
  blockUser,
  canPostToCommunity,
  createComment,
  createPost,
  deleteOwnComment,
  deleteOwnPost,
  reportContent,
  toggleLike,
  type PostKind,
  type ReportReason,
} from '@/lib/community';

async function requireUser() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) redirect('/login?redirect=/community');
  return user;
}

export async function createPostAction(formData: FormData) {
  const user = await requireUser();

  if (!(await canPostToCommunity(user.id))) {
    redirect(
      `/community?error=${encodeURIComponent(
        'الكتابة في الكوميونيتي للمشتركين وطلبة الكورسات. ابدأ كورس مجاني الأول 🙂'
      )}`
    );
  }

  const rawKind = String(formData.get('kind') || 'discussion');
  const kind = (POST_KINDS as readonly string[]).includes(rawKind)
    ? (rawKind as PostKind)
    : 'discussion';

  const groupId = (formData.get('group_id') as string) || null;

  const result = await createPost({
    userId: user.id,
    kind,
    title: (formData.get('title') as string) || null,
    body: String(formData.get('body') || ''),
    courseId: (formData.get('course_id') as string) || null,
    groupId,
  });

  if ('error' in result) {
    redirect(`/community?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath('/community');
  // A student's post is queued, not published — say so instead of
  // dropping them on a page where their post doesn't appear.
  redirect(
    `/community${groupId ? `?group=${groupId}` : ''}${groupId ? '&' : '?'}notice=${encodeURIComponent(
      'وصلنا بوستك ✅ هيظهر بعد مراجعة فريق فاهم.'
    )}`
  );
}

export async function createCommentAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get('post_id') || '');
  if (!postId) redirect('/community');

  if (!(await canPostToCommunity(user.id))) {
    redirect(
      `/community/${postId}?error=${encodeURIComponent(
        'التعليق للمشتركين وطلبة الكورسات.'
      )}`
    );
  }

  const result = await createComment({
    userId: user.id,
    postId,
    body: String(formData.get('body') || ''),
    parentId: (formData.get('parent_id') as string) || null,
  });

  if ('error' in result) {
    redirect(`/community/${postId}?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath(`/community/${postId}`);
  revalidatePath('/community');
  redirect(`/community/${postId}#c-${result.id}`);
}

export async function toggleLikeAction(formData: FormData) {
  const user = await requireUser();
  const targetType = String(formData.get('target_type') || 'post');
  const targetId = String(formData.get('target_id') || '');
  if (!targetId || (targetType !== 'post' && targetType !== 'comment')) return;

  await toggleLike({ userId: user.id, targetType, targetId });

  // The like lives on both the feed card and the detail page.
  revalidatePath('/community');
  revalidatePath(`/community/${String(formData.get('post_id') || targetId)}`);
}

export async function deletePostAction(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get('post_id') || '');
  if (!postId) return;
  await deleteOwnPost(user.id, postId);
  revalidatePath('/community');
  redirect('/community');
}

export async function deleteCommentAction(formData: FormData) {
  const user = await requireUser();
  const commentId = String(formData.get('comment_id') || '');
  const postId = String(formData.get('post_id') || '');
  if (!commentId) return;
  await deleteOwnComment(user.id, commentId);
  revalidatePath(`/community/${postId}`);
}

/**
 * Report content. Required by App Store guideline 1.2 — and the same
 * control belongs on the web so a reporter isn't told to go install an
 * app to flag something.
 */
export async function reportContentAction(formData: FormData) {
  const user = await requireUser();
  const targetType = String(formData.get('target_type') || '');
  const targetId = String(formData.get('target_id') || '');
  const postId = String(formData.get('post_id') || targetId);
  const rawReason = String(formData.get('reason') || 'other');

  if (!targetId || (targetType !== 'post' && targetType !== 'comment')) {
    redirect('/community');
  }

  const reason = (REPORT_REASONS as readonly string[]).includes(rawReason)
    ? (rawReason as ReportReason)
    : 'other';

  const result = await reportContent({
    reporterId: user.id,
    targetType,
    targetId,
    reason,
    note: (formData.get('note') as string) || null,
  });

  const message =
    'error' in result
      ? result.error
      : 'وصلنا بلاغك، وهنراجعه في أقرب وقت. شكراً ليك.';
  const key = 'error' in result ? 'error' : 'notice';

  revalidatePath(`/community/${postId}`);
  redirect(`/community/${postId}?${key}=${encodeURIComponent(message)}`);
}

/**
 * Block an author. Personal and one-directional — it hides their content
 * from this user's feed only, and the filter lives in the feed RPC so
 * every client honours it.
 */
export async function blockUserAction(formData: FormData) {
  const user = await requireUser();
  const targetUserId = String(formData.get('user_id') || '');
  if (!targetUserId || targetUserId === user.id) redirect('/community');

  await blockUser(user.id, targetUserId);

  revalidatePath('/community');
  redirect(
    `/community?notice=${encodeURIComponent('تم حظر المستخدم ده. مش هتشوف محتواه تاني.')}`
  );
}
