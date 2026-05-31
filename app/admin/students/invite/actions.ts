'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';

type PlanChoice = 'monthly' | 'yearly';

/**
 * Send a Supabase invite email to a prospective student, optionally
 * granting them a free subscription on acceptance.
 *
 * Flow:
 *   1. Admin enters email + optionally picks a free trial duration:
 *        - "monthly" → 30 days of full access, no payment
 *        - "yearly"  → 365 days of full access, no payment
 *      Leaving the plan blank just sends a signup invite; the invitee
 *      will need to pick + pay for a plan on /pricing themselves.
 *   2. We insert a pending_invites row recording the intent
 *   3. service.auth.admin.inviteUserByEmail() triggers Supabase to send
 *      the magic-link email
 *   4. Invitee clicks the link → lands on /auth/callback?code=...
 *   5. /auth/callback exchanges the code, reads pending_invites for that
 *      email, materialises a free subscription row when intended_plan
 *      is set (gateway='manual'), and routes them to /dashboard.
 *
 * Already-registered emails skip the email send and get the subscription
 * (if specified) granted directly so the admin's effort isn't wasted.
 */
export async function inviteStudent(formData: FormData) {
  const ctx = await requireAdmin();

  const emailRaw = String(formData.get('email') || '').trim();
  const email = emailRaw.toLowerCase();
  const planRaw = String(formData.get('plan') || '').trim();
  const plan: PlanChoice | null =
    planRaw === 'monthly' || planRaw === 'yearly' ? planRaw : null;
  const courseIdRaw = String(formData.get('course_id') || '').trim();
  const courseId = courseIdRaw || null;
  const notes = String(formData.get('notes') || '').trim() || null;

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
        metadata: { email, plan, course_id: courseId, notes },
      },
      async () => {
        const service = createServiceClient();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://faahm.vercel.app';

        // Record the intent first so the auth callback has it ready
        // even if the email send fails.
        await service.from('pending_invites').insert({
          email,
          intended_plan: plan,
          intended_course_id: courseId,
          invited_by: ctx.userId,
          notes,
        });

        const { error } = await service.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/dashboard?invited=1')}`,
          data: {
            invited_by: ctx.userId,
            intended_plan: plan,
          },
        });

        if (error) {
          // Already-registered → grant the subscription directly so the
          // admin doesn't have to chase it.
          if (
            /already.*registered|already.*exists/i.test(error.message) ||
            error.status === 422
          ) {
            const { data: existing } = await service
              .from('admin_students_v')
              .select('id, email')
              .ilike('email', email)
              .maybeSingle();

            // Course picked → per-course enrollment with the chosen duration
            // (or permanent if no duration was specified).
            // No course + plan picked → full-catalogue subscription.
            // No course + no plan → invite-only, nothing to grant.
            if (existing?.id && courseId) {
              const days = plan === 'yearly' ? 365 : plan === 'monthly' ? 30 : null;
              const expiresAt = days
                ? new Date(Date.now() + days * 86_400_000).toISOString()
                : null;
              await service.from('enrollments').upsert(
                {
                  user_id: existing.id,
                  course_id: courseId,
                  expires_at: expiresAt,
                  source: 'promo',
                  notes: notes ? `From invite: ${notes}` : 'From admin invitation',
                },
                { onConflict: 'user_id,course_id' }
              );
            } else if (existing?.id && plan) {
              await grantManualSubscription(service, existing.id, plan);
            }
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

/**
 * Create or extend a free subscription for a user. Shared by both the
 * already-registered branch above and the auth callback's invite consumer.
 * - monthly = 30 days, yearly = 365 days
 * - If the user already has an active subscription, EXTEND its
 *   current_period_end rather than creating a competing row.
 */
export async function grantManualSubscription(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  plan: PlanChoice
) {
  const days = plan === 'yearly' ? 365 : 30;
  const now = new Date();

  const { data: active } = await service
    .from('subscriptions')
    .select('id, current_period_end, plan')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) {
    // Extend from the later of (now, current end) so the gift is purely
    // additive — paying customers don't get their paid time shortened.
    const base = new Date(active.current_period_end);
    const start = base > now ? base : now;
    const newEnd = new Date(start.getTime() + days * 86_400_000);
    await service
      .from('subscriptions')
      .update({
        current_period_end: newEnd.toISOString(),
        status: 'active',
        updated_at: now.toISOString(),
      })
      .eq('id', active.id);
    return;
  }

  // Brand-new manual grant.
  await service.from('subscriptions').insert({
    user_id: userId,
    plan,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: new Date(now.getTime() + days * 86_400_000).toISOString(),
    gateway: 'manual',
  });
}

