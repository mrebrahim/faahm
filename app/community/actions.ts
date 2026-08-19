'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  POST_KINDS,
  canPostToCommunity,
  createComment,
  createPost,
  deleteOwnComment,
  deleteOwnPost,
  toggleLike,
  type PostKind,
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

  const result = await createPost({
    userId: user.id,
    kind,
    title: (formData.get('title') as string) || null,
    body: String(formData.get('body') || ''),
    courseId: (formData.get('course_id') as string) || null,
  });

  if ('error' in result) {
    redirect(`/community?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath('/community');
  redirect(`/community/${result.id}`);
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
