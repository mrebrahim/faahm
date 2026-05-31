'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';
import { resolveAppUrl } from '@/lib/app-url';

const VALID_ROLES = new Set(['student', 'instructor', 'admin']);

/**
 * Self-protection: an admin can take destructive actions on any account
 * except their own (no foot-guns like banning yourself).
 */
function refusingSelf(adminId: string, targetId: string, action: string) {
  if (adminId === targetId) {
    throw new Error(`لا يمكنك تنفيذ "${action}" على حسابك الخاص.`);
  }
}

export async function banStudent(formData: FormData) {
  const ctx = await requireAdmin();
  const targetId = String(formData.get('id') || '');
  const reason = String(formData.get('reason') || '').trim();
  if (!targetId) return;
  refusingSelf(ctx.userId!, targetId, 'حظر');

  await loggedAction(
    ctx,
    {
      action: 'student.banned',
      resourceType: 'profile',
      resourceId: targetId,
      metadata: { reason: reason || null },
    },
    async () => {
      const service = createServiceClient();
      await service
        .from('profiles')
        .update({
          is_blocked: true,
          banned_at: new Date().toISOString(),
          banned_reason: reason || null,
          banned_by: ctx.userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId);

      // Kill all of their active sessions so the ban takes effect immediately
      // instead of after their JWT happens to expire.
      try {
        await service.auth.admin.signOut(targetId, 'global');
      } catch {
        // Already signed out / unknown user — not fatal.
      }
    }
  );

  revalidatePath(`/admin/students/${targetId}`);
  revalidatePath('/admin/students');
  redirect(`/admin/students/${targetId}?success=banned`);
}

export async function unbanStudent(formData: FormData) {
  const ctx = await requireAdmin();
  const targetId = String(formData.get('id') || '');
  if (!targetId) return;

  await loggedAction(
    ctx,
    {
      action: 'student.unbanned',
      resourceType: 'profile',
      resourceId: targetId,
    },
    async () => {
      const service = createServiceClient();
      await service
        .from('profiles')
        .update({
          is_blocked: false,
          banned_at: null,
          banned_reason: null,
          banned_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId);
    }
  );

  revalidatePath(`/admin/students/${targetId}`);
  revalidatePath('/admin/students');
  redirect(`/admin/students/${targetId}?success=unbanned`);
}

export async function changeStudentRole(formData: FormData) {
  const ctx = await requireAdmin();
  const targetId = String(formData.get('id') || '');
  const newRole = String(formData.get('role') || '');
  if (!targetId || !VALID_ROLES.has(newRole)) return;
  refusingSelf(ctx.userId!, targetId, 'تغيير الدور');

  await loggedAction(
    ctx,
    {
      action: 'student.role_changed',
      resourceType: 'profile',
      resourceId: targetId,
      metadata: { new_role: newRole },
    },
    async () => {
      const service = createServiceClient();
      await service
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', targetId);
    }
  );

  revalidatePath(`/admin/students/${targetId}`);
  revalidatePath('/admin/students');
  redirect(`/admin/students/${targetId}?success=role_changed`);
}

export async function sendPasswordReset(formData: FormData) {
  const ctx = await requireAdmin();
  const targetId = String(formData.get('id') || '');
  if (!targetId) return;

  const service = createServiceClient();
  const { data: u } = await service
    .from('admin_students_v')
    .select('email')
    .eq('id', targetId)
    .maybeSingle();
  if (!u?.email) {
    redirect(`/admin/students/${targetId}?error=${encodeURIComponent('الإيميل غير موجود')}`);
  }

  const appUrl = resolveAppUrl();

  await loggedAction(
    ctx,
    {
      action: 'student.password_reset_sent',
      resourceType: 'profile',
      resourceId: targetId,
      metadata: { email: u!.email },
    },
    async () => {
      // resetPasswordForEmail uses the anon client and Supabase's normal
      // email pipeline; admin-API generateLink would skip the email step
      // entirely, which we don't want.
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(u!.email, {
        redirectTo: `${appUrl}/reset-password`,
      });
      if (error) throw new Error(error.message);
    }
  );

  redirect(`/admin/students/${targetId}?success=reset_sent`);
}

export async function revokeStudentSessions(formData: FormData) {
  const ctx = await requireAdmin();
  const targetId = String(formData.get('id') || '');
  if (!targetId) return;

  await loggedAction(
    ctx,
    {
      action: 'student.sessions_revoked',
      resourceType: 'profile',
      resourceId: targetId,
    },
    async () => {
      const service = createServiceClient();
      await service.auth.admin.signOut(targetId, 'global');
    }
  );

  redirect(`/admin/students/${targetId}?success=sessions_revoked`);
}

export async function enrollStudent(formData: FormData) {
  const ctx = await requireAdmin();
  const studentId = String(formData.get('id') || '');
  const courseId = String(formData.get('course_id') || '');
  const note = String(formData.get('notes') || '').trim() || null;
  if (!studentId || !courseId) return;

  await loggedAction(
    ctx,
    {
      action: 'student.enrolled',
      resourceType: 'profile',
      resourceId: studentId,
      metadata: { course_id: courseId, notes: note },
    },
    async () => {
      const service = createServiceClient();
      // upsert so re-enrolling someone is idempotent and refreshes granted_by.
      await service.from('enrollments').upsert(
        {
          user_id: studentId,
          course_id: courseId,
          granted_by: ctx.userId,
          granted_at: new Date().toISOString(),
          source: 'manual',
          notes: note,
        },
        { onConflict: 'user_id,course_id' }
      );
    }
  );

  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/students/${studentId}?tab=enrollments&success=enrolled`);
}

export async function unenrollStudent(formData: FormData) {
  const ctx = await requireAdmin();
  const studentId = String(formData.get('id') || '');
  const courseId = String(formData.get('course_id') || '');
  if (!studentId || !courseId) return;

  await loggedAction(
    ctx,
    {
      action: 'student.unenrolled',
      resourceType: 'profile',
      resourceId: studentId,
      metadata: { course_id: courseId },
    },
    async () => {
      const service = createServiceClient();
      await service
        .from('enrollments')
        .delete()
        .eq('user_id', studentId)
        .eq('course_id', courseId);
    }
  );

  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/students/${studentId}?tab=enrollments&success=unenrolled`);
}

export async function saveStudentNotes(formData: FormData) {
  const ctx = await requireAdmin();
  const targetId = String(formData.get('id') || '');
  const notes = String(formData.get('notes') || '');
  if (!targetId) return;

  await loggedAction(
    ctx,
    {
      action: 'student.notes_updated',
      resourceType: 'profile',
      resourceId: targetId,
      metadata: { length: notes.length },
    },
    async () => {
      const service = createServiceClient();
      await service
        .from('profiles')
        .update({ notes: notes || null, updated_at: new Date().toISOString() })
        .eq('id', targetId);
    }
  );

  revalidatePath(`/admin/students/${targetId}`);
}

/**
 * Permanently delete a student. Removes the auth.users row, which
 * cascades to profiles, enrollments, subscriptions, and any other
 * tables with `on delete cascade` on user_id. Use with care — there
 * is no undo. Refuses to delete admins / instructors so an admin
 * can't accidentally wipe a teammate.
 */
export async function deleteStudent(formData: FormData) {
  const ctx = await requireAdmin();
  const targetId = String(formData.get('id') || '');
  if (!targetId) return;
  if (targetId === ctx.userId) {
    redirect('/admin/students?error=' + encodeURIComponent('ما تقدرش تحذف نفسك.'));
  }

  await loggedAction(
    ctx,
    {
      action: 'student.deleted',
      resourceType: 'profile',
      resourceId: targetId,
    },
    async () => {
      const service = createServiceClient();

      // Guard against deleting admins/instructors.
      const { data: prof } = await service
        .from('profiles')
        .select('role')
        .eq('id', targetId)
        .maybeSingle();
      if (prof?.role && prof.role !== 'student') {
        throw new Error(`ما ينفعش تحذف حساب من نوع "${prof.role}" من هنا.`);
      }

      const { error } = await service.auth.admin.deleteUser(targetId);
      if (error) throw new Error(error.message);
    }
  ).catch((err) => {
    redirect('/admin/students?error=' + encodeURIComponent(err.message));
  });

  revalidatePath('/admin/students');
  redirect('/admin/students?success=deleted');
}
