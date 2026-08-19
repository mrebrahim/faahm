'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';

/**
 * Community moderation. Every action here is audit-logged — moderation
 * decisions are exactly the kind of thing you need a record of when a
 * student asks why their post disappeared.
 */

export async function hidePost(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const hide = formData.get('hide') === 'true';
  const reason = String(formData.get('reason') || '') || null;
  if (!id) return;

  await loggedAction(
    ctx,
    {
      action: hide ? 'community.post.hide' : 'community.post.unhide',
      resourceType: 'community_post',
      resourceId: id,
      metadata: { reason },
    },
    async () => {
      await createServiceClient()
        .from('community_posts')
        .update({
          is_hidden: hide,
          hidden_by: hide ? ctx.userId : null,
          hidden_reason: hide ? reason : null,
        })
        .eq('id', id);
    }
  );

  revalidatePath('/admin/community');
  revalidatePath('/community');
  revalidatePath(`/community/${id}`);
}

export async function lockPost(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const lock = formData.get('lock') === 'true';
  if (!id) return;

  await loggedAction(
    ctx,
    {
      action: lock ? 'community.post.lock' : 'community.post.unlock',
      resourceType: 'community_post',
      resourceId: id,
    },
    async () => {
      await createServiceClient()
        .from('community_posts')
        .update({ is_locked: lock })
        .eq('id', id);
    }
  );

  revalidatePath('/admin/community');
  revalidatePath(`/community/${id}`);
}

export async function pinPost(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const pin = formData.get('pin') === 'true';
  if (!id) return;

  await loggedAction(
    ctx,
    {
      action: pin ? 'community.post.pin' : 'community.post.unpin',
      resourceType: 'community_post',
      resourceId: id,
    },
    async () => {
      await createServiceClient()
        .from('community_posts')
        .update({ is_pinned: pin })
        .eq('id', id);
    }
  );

  revalidatePath('/admin/community');
  revalidatePath('/community');
}

export async function hideComment(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const hide = formData.get('hide') === 'true';
  if (!id) return;

  await loggedAction(
    ctx,
    {
      action: hide ? 'community.comment.hide' : 'community.comment.unhide',
      resourceType: 'community_comment',
      resourceId: id,
    },
    async () => {
      await createServiceClient()
        .from('community_comments')
        .update({ is_hidden: hide, hidden_by: hide ? ctx.userId : null })
        .eq('id', id);
    }
  );

  revalidatePath('/admin/community');
}

/**
 * Close a report. `action` records whether we acted on it or judged it
 * unfounded — the distinction matters when reviewing a repeat reporter.
 */
export async function resolveReport(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || 'dismissed');
  if (!id || !['actioned', 'dismissed'].includes(status)) return;

  await loggedAction(
    ctx,
    {
      action: `community.report.${status}`,
      resourceType: 'community_report',
      resourceId: id,
    },
    async () => {
      await createServiceClient()
        .from('community_reports')
        .update({
          status,
          reviewed_by: ctx.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
  );

  revalidatePath('/admin/community');
}

/**
 * Hide a reported item and close its report in one step — the common
 * case, and doing it as two clicks invites half-finished moderation.
 */
export async function actionReport(formData: FormData) {
  const ctx = await requireAdmin();
  const reportId = String(formData.get('report_id') || '');
  const targetType = String(formData.get('target_type') || '');
  const targetId = String(formData.get('target_id') || '');
  if (!reportId || !targetId) return;

  const service = createServiceClient();

  await loggedAction(
    ctx,
    {
      action: 'community.report.action_and_hide',
      resourceType: 'community_report',
      resourceId: reportId,
      metadata: { targetType, targetId },
    },
    async () => {
      if (targetType === 'post') {
        await service
          .from('community_posts')
          .update({
            is_hidden: true,
            hidden_by: ctx.userId,
            hidden_reason: 'بلاغ من مستخدم',
          })
          .eq('id', targetId);
      } else {
        await service
          .from('community_comments')
          .update({ is_hidden: true, hidden_by: ctx.userId })
          .eq('id', targetId);
      }

      // Close every open report on the same item, not just the one the
      // moderator clicked — otherwise duplicates linger in the queue
      // pointing at content that's already gone.
      await service
        .from('community_reports')
        .update({
          status: 'actioned',
          reviewed_by: ctx.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('status', 'open');
    }
  );

  revalidatePath('/admin/community');
  revalidatePath('/community');
}
