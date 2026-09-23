'use server';

import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/admin-guard';
import { auditLog, loggedAction } from '@/lib/admin-audit';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { startImpersonation, endImpersonation } from '@/lib/impersonation';

/**
 * "View as student" — open the admin's browser on a student's account.
 *
 * Super-admin only, students only, and audited both ways. See
 * lib/impersonation.ts for why each of those is non-negotiable.
 */
export async function viewAsStudent(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const targetUserId = String(formData.get('user_id') || '');
  if (!targetUserId) redirect('/admin/students?error=missing_user');

  // Resolve the target's email for the audit trail BEFORE the session
  // swaps — afterwards this request is acting as the student, and the
  // log entry has to name the admin who did it.
  const { data: targetUser } = await createServiceClient()
    .auth.admin.getUserById(targetUserId);

  let outcome: { ok: true; targetEmail: string } | { error: string } = {
    error: 'unknown',
  };

  try {
    await loggedAction(
      ctx,
      {
        action: 'admin.impersonation_started',
        resourceType: 'profile',
        resourceId: targetUserId,
        metadata: { target_email: targetUser?.user?.email ?? null },
      },
      async () => {
        outcome = await startImpersonation({
          adminEmail: ctx.userEmail ?? '',
          targetUserId,
        });
        // Thrown so the audit row records a failure; caught right below
        // so the admin gets the reason instead of a 500.
        if ('error' in outcome) throw new Error(outcome.error);
      }
    );
  } catch {
    // outcome already carries the message.
  }

  if ('error' in outcome) {
    redirect(`/admin/students?error=${encodeURIComponent(outcome.error)}`);
  }

  // Land on the dashboard — the first thing you want to check is what
  // the student sees when they sign in.
  redirect('/dashboard');
}

/**
 * Hand the admin their own account back.
 *
 * Deliberately NOT behind requireSuperAdmin: the caller is currently
 * signed in AS THE STUDENT, so that check would fail and strand them.
 * The authority comes from the httpOnly cookie, which endImpersonation
 * re-validates against the allow-list before restoring anything.
 */
export async function stopViewingAsStudent() {
  const result = await endImpersonation();

  if ('error' in result) {
    redirect('/login?error=impersonation_ended');
  }

  // Logged from the restored admin identity so the pair of entries
  // brackets the session in the audit trail. The id is resolved rather
  // than left null so the row joins to the admin like every other one.
  const { data: profile } = await createServiceClient()
    .from('profiles')
    .select('id, role')
    .eq('id', (await createClient().auth.getUser()).data.user?.id ?? '')
    .maybeSingle();

  await auditLog(
    {
      userId: profile?.id ?? null,
      userEmail: result.adminEmail,
      userRole: profile?.role ?? 'super_admin',
    },
    { action: 'admin.impersonation_ended' }
  );

  redirect('/admin/students');
}
