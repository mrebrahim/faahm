'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';
import { awardXp } from '@/lib/xp';

/**
 * Community groups — admin only.
 *
 * A group is either tied to specific courses (visible to anyone who can
 * open one of them) or general, and is aimed at subscribers,
 * non-subscribers, or everyone. Membership is never stored: it's derived
 * per request from the viewer's live access, so a lapsed subscription
 * drops the paid rooms with nothing to clean up.
 */

const SCOPES = ['course', 'general'] as const;
const AUDIENCES = ['subscribers', 'non_subscribers', 'everyone'] as const;

export async function createGroup(formData: FormData) {
  const ctx = await requireAdmin();

  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;
  const rawScope = String(formData.get('scope') || 'general');
  const rawAudience = String(formData.get('audience') || 'everyone');
  const allowPosts = formData.get('allow_posts') === 'on';
  const courseIds = formData.getAll('course_ids').map(String).filter(Boolean);

  if (name.length < 2) {
    redirect(`/admin/community?tab=groups&error=${encodeURIComponent('اكتب اسم للجروب.')}`);
  }

  const scope = (SCOPES as readonly string[]).includes(rawScope)
    ? (rawScope as (typeof SCOPES)[number])
    : 'general';
  const audience = (AUDIENCES as readonly string[]).includes(rawAudience)
    ? (rawAudience as (typeof AUDIENCES)[number])
    : 'everyone';

  // A course-scoped group with no courses would be invisible to
  // everybody — catch it here rather than letting an admin wonder why
  // their new room never appears.
  if (scope === 'course' && courseIds.length === 0) {
    redirect(
      `/admin/community?tab=groups&error=${encodeURIComponent(
        'اخترت جروب مرتبط بكورسات — لازم تختار كورس واحد على الأقل.'
      )}`
    );
  }

  const service = createServiceClient();

  await loggedAction(
    ctx,
    {
      action: 'community.group.create',
      resourceType: 'community_group',
      metadata: { name, scope, audience, courses: courseIds.length },
    },
    async () => {
      const { data, error } = await service
        .from('community_groups')
        .insert({
          name,
          description,
          scope,
          audience,
          allow_posts: allowPosts,
          created_by: ctx.userId,
        })
        .select('id')
        .single();

      if (error || !data) throw new Error(error?.message ?? 'insert failed');

      if (scope === 'course' && courseIds.length) {
        await service.from('community_group_courses').insert(
          courseIds.map((course_id) => ({ group_id: data.id, course_id }))
        );
      }
    }
  );

  revalidatePath('/admin/community');
  revalidatePath('/community');
  redirect('/admin/community?tab=groups&success=1');
}

export async function toggleGroupActive(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const active = formData.get('active') === 'true';
  if (!id) return;

  await loggedAction(
    ctx,
    {
      action: active ? 'community.group.activate' : 'community.group.deactivate',
      resourceType: 'community_group',
      resourceId: id,
    },
    async () => {
      await createServiceClient()
        .from('community_groups')
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq('id', id);
    }
  );

  revalidatePath('/admin/community');
  revalidatePath('/community');
}

export async function deleteGroup(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  if (!id) return;

  await loggedAction(
    ctx,
    { action: 'community.group.delete', resourceType: 'community_group', resourceId: id },
    async () => {
      // Posts cascade with the group. Deactivating is usually the better
      // move; this exists for a group created by mistake.
      await createServiceClient().from('community_groups').delete().eq('id', id);
    }
  );

  revalidatePath('/admin/community');
  revalidatePath('/community');
}

// ---------------- post approval ----------------

/**
 * Approve a student's post. XP is awarded HERE rather than at submission
 * so nobody can farm points with rubbish that never gets published.
 */
export async function approvePost(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  if (!id) return;

  const service = createServiceClient();

  await loggedAction(
    ctx,
    { action: 'community.post.approve', resourceType: 'community_post', resourceId: id },
    async () => {
      const { data: post } = await service
        .from('community_posts')
        .select('id, user_id, course_id, status')
        .eq('id', id)
        .maybeSingle();

      if (!post || post.status === 'approved') return;

      await service
        .from('community_posts')
        .update({
          status: 'approved',
          reviewed_by: ctx.userId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
          // Bump it to the top of the feed on publish, not on submission —
          // otherwise a post that sat in the queue for two days appears
          // already buried.
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', id);

      await awardXp({
        userId: post.user_id,
        kind: 'community_post',
        refKey: `post:${post.id}`,
        courseId: post.course_id,
      });
    }
  );

  revalidatePath('/admin/community');
  revalidatePath('/community');
}

export async function rejectPost(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const reason = String(formData.get('reason') || '').trim() || null;
  if (!id) return;

  await loggedAction(
    ctx,
    {
      action: 'community.post.reject',
      resourceType: 'community_post',
      resourceId: id,
      metadata: { reason },
    },
    async () => {
      await createServiceClient()
        .from('community_posts')
        .update({
          status: 'rejected',
          reviewed_by: ctx.userId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id);
    }
  );

  revalidatePath('/admin/community');
}

/**
 * Post as the platform. Admin posts skip the queue — there's nobody
 * above an admin to review them.
 */
export async function createAdminPost(formData: FormData) {
  const ctx = await requireAdmin();
  const groupId = String(formData.get('group_id') || '') || null;
  const title = String(formData.get('title') || '').trim() || null;
  const body = String(formData.get('body') || '').trim();
  const kind = String(formData.get('kind') || 'discussion');
  const pinned = formData.get('pin') === 'on';

  if (body.length < 2 || !ctx.userId) {
    redirect(`/admin/community?tab=groups&error=${encodeURIComponent('اكتب محتوى البوست.')}`);
  }

  await loggedAction(
    ctx,
    { action: 'community.post.create_admin', resourceType: 'community_post', metadata: { groupId } },
    async () => {
      await createServiceClient().from('community_posts').insert({
        user_id: ctx.userId,
        group_id: groupId,
        kind,
        title,
        body,
        status: 'approved',
        is_pinned: pinned,
        reviewed_by: ctx.userId,
        reviewed_at: new Date().toISOString(),
      });
    }
  );

  revalidatePath('/admin/community');
  revalidatePath('/community');
  redirect('/admin/community?tab=groups&success=1');
}
