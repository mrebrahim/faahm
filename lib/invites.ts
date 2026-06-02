import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Apply any unaccepted `pending_invites` rows for the currently-signed-in
 * user's email. Safe to call anywhere there's an authenticated request —
 * it's a no-op if there are no rows.
 *
 * Why this exists as a shared helper: the Supabase invite flow doesn't
 * always come back through /auth/callback with a `?code=` (PKCE) — for
 * older email links it lands with the session in the URL `#hash` and our
 * server-side callback can't read that. So we also run this on /dashboard
 * after middleware has confirmed the user, which catches the hash-flow
 * case on the very next page load.
 *
 * Idempotent: rows with `accepted_at` set are filtered out; subscription
 * grants extend existing active subs instead of replacing them.
 */
export async function applyPendingInvitesForCurrentUser(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const service = createServiceClient();
    const emailLower = user.email.toLowerCase();

    const { data: invites } = await service
      .from('pending_invites')
      .select('id, intended_plan, intended_course_id, intended_paid_amount_cents, notes')
      .ilike('email', emailLower)
      .is('accepted_at', null);

    if (!invites || invites.length === 0) return;

    // Lazy import keeps the server-actions module out of bundles that
    // only need to read; only the post-acceptance path actually grants.
    const { grantManualSubscription, recordManualPayment } = await import(
      '@/app/admin/students/invite/actions'
    );

    for (const inv of invites) {
      // Single-course invite wins over a plan: the admin picked a course
      // explicitly, so we honour that and use the plan only as a duration.
      // Plan with no course → grant a global subscription (open everything).
      if (inv.intended_course_id) {
        const days =
          inv.intended_plan === 'yearly'
            ? 365
            : inv.intended_plan === 'monthly'
              ? 30
              : null;
        const expiresAt = days
          ? new Date(Date.now() + days * 86_400_000).toISOString()
          : null;
        await service.from('enrollments').upsert(
          {
            user_id: user.id,
            course_id: inv.intended_course_id,
            expires_at: expiresAt,
            granted_by: null,
            source: 'promo',
            notes: inv.notes ? `From invite: ${inv.notes}` : 'From admin invitation',
          },
          { onConflict: 'user_id,course_id' }
        );
      } else if (inv.intended_plan === 'monthly' || inv.intended_plan === 'yearly') {
        await grantManualSubscription(service, user.id, inv.intended_plan);
      }

      // If the admin recorded a manual payment for this invite, write
      // the matching payments row so /admin/revenue picks it up.
      if (inv.intended_paid_amount_cents && inv.intended_paid_amount_cents > 0) {
        await recordManualPayment(service, {
          userId: user.id,
          amountCents: inv.intended_paid_amount_cents,
          courseId: inv.intended_course_id,
          plan:
            inv.intended_plan === 'monthly' || inv.intended_plan === 'yearly'
              ? inv.intended_plan
              : null,
          notes: inv.notes,
        });
      }

      await service
        .from('pending_invites')
        .update({
          accepted_at: new Date().toISOString(),
          accepted_user_id: user.id,
        })
        .eq('id', inv.id);
    }
  } catch (err) {
    // Best-effort only — never block a page render on this.
    console.error('[invites] applyPendingInvitesForCurrentUser failed', err);
  }
}
