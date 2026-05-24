'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';

/**
 * Send a Supabase invite email to a prospective student.
 *
 * Flow:
 *   1. Admin enters email + optional course pick
 *   2. We insert a pending_invites row recording the intent
 *   3. service.auth.admin.inviteUserByEmail() triggers Supabase to send the
 *      magic-link email from its own SMTP pipeline
 *   4. Invitee clicks the link → lands on /auth/callback?code=...
 *   5. /auth/callback exchanges the code, then reads pending_invites for
 *      that email and creates enrollments before bouncing them to /pricing
 *
 * If the email is already a registered user, Supabase returns an
 * "already_registered" error. We catch it and create the enrollment
 * directly so the invite isn't wasted.
 */
export async function inviteStudent(formData: FormData) {
  const ctx = await requireAdmin();

  const emailRaw = String(formData.get('email') || '').trim();
  const email = emailRaw.toLowerCase();
  const courseId = (String(formData.get('course_id') || '').trim() || null) as string | null;
  const notes = String(formData.get('notes') || '').trim() || null;

  // Cheap server-side validation; the form also has a type="email" input.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(
      '/admin/students/invite?error=' +
        encodeURIComponent('من فضلك أدخل بريدًا إلكترونيًا صحيحًا.')
    );
  }

  let result: 'sent' | 'already_registered' = 'sent';

  try {
    await loggedAction(
      ctx,
      {
        action: 'student.invited',
        resourceType: 'invite',
        metadata: { email, course_id: courseId, notes },
      },
      async () => {
        const service = createServiceClient();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://faahm.vercel.app';

        // Record the intent first so the auth callback has it ready
        // even if the email send fails.
        await service.from('pending_invites').insert({
          email,
          intended_course_id: courseId,
          invited_by: ctx.userId,
          notes,
        });

        const { error } = await service.auth.admin.inviteUserByEmail(email, {
          // After clicking the link, Supabase redirects here; we then
          // route to /pricing once we've processed any pending invites.
          redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/pricing?invite=1')}`,
          data: {
            invited_by: ctx.userId,
            intended_course_id: courseId,
          },
        });

        if (error) {
          // "User already registered" is a normal case — fall through to
          // the existing-user path. Anything else is a real failure.
          if (
            /already.*registered|already.*exists/i.test(error.message) ||
            error.status === 422
          ) {
            // Look up the existing user and (if a course was specified)
            // enroll them directly. They won't get a fresh signup email,
            // but they'll see the course access on their next login.
            const { data: existing } = await service
              .from('admin_students_v')
              .select('id, email')
              .ilike('email', email)
              .maybeSingle();
            if (existing?.id && courseId) {
              await service.from('enrollments').upsert(
                {
                  user_id: existing.id,
                  course_id: courseId,
                  granted_by: ctx.userId,
                  source: 'manual',
                  notes: notes
                    ? `Auto-enrolled from re-invite: ${notes}`
                    : 'Auto-enrolled from re-invite',
                },
                { onConflict: 'user_id,course_id' }
              );
            }
            // Mark the pending row as resolved.
            await service
              .from('pending_invites')
              .update({
                accepted_at: new Date().toISOString(),
                accepted_user_id: existing?.id ?? null,
                notes: (notes ? notes + ' · ' : '') + 'already registered',
              })
              .eq('email', email)
              .is('accepted_at', null);
            result = 'already_registered';
            return;
          }
          throw new Error(error.message);
        }
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل إرسال الدعوة';
    redirect('/admin/students/invite?error=' + encodeURIComponent(message));
  }

  revalidatePath('/admin/students/invite');
  redirect(
    `/admin/students/invite?success=${result}&email=${encodeURIComponent(emailRaw)}`
  );
}

export async function cancelPendingInvite(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  if (!id) return;

  await loggedAction(
    ctx,
    {
      action: 'student.invite_cancelled',
      resourceType: 'invite',
      resourceId: id,
    },
    async () => {
      const service = createServiceClient();
      await service.from('pending_invites').delete().eq('id', id).is('accepted_at', null);
    }
  );

  revalidatePath('/admin/students/invite');
  redirect('/admin/students/invite?success=cancelled');
}
