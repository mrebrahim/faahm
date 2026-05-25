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
      .select('id, intended_plan, intended_course_id, notes')
      .ilike('email', emailLower)
      .is('accepted_at', null);

    if (!invites || invites.length === 0) return;

    // Lazy import keeps the server-actions module out of bundles that
    // only need to read; only the post-acceptance path actually grants.
    const { grantManualSubscription } = await import(
      '@/app/admin/students/invite/actions'
    );

    for (const inv of invites) {
      if (inv.intended_plan === 'monthly' || inv.intended_plan === 'yearly') {
        await grantManualSubscription(service, user.id, inv.intended_plan);
      }

      // Legacy column from the earlier course-based invite iteration —
      // still honoured so older pending rows aren't orphaned.
      if (inv.intended_course_id) {
        await service.from('enrollments').upsert(
          {
            user_id: user.id,
            course_id: inv.intended_course_id,
            granted_by: null,
            source: 'promo',
            notes: inv.notes
              ? `From invite: ${inv.notes}`
              : 'From admin invitation',
          },
          { onConflict: 'user_id,course_id' }
        );
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
