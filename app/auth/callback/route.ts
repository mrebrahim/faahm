import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Handles auth callbacks (email confirmation, OAuth, invite acceptance).
 *
 *   GET /auth/callback?code=xxx[&next=/some/path]
 *
 * After the code exchange we look up any pending_invites for this user's
 * email and apply them: each row with an intended_course_id becomes a free
 * per-course enrollment, then the row is marked accepted. Failures here
 * never block the redirect — admin can re-issue from the invite UI.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('فشل التحقق')}`
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('فشل التحقق')}`
    );
  }

  await applyPendingInvites();

  return NextResponse.redirect(`${origin}${next}`);
}

/**
 * Look up pending invites for the freshly-signed-in user's email and
 * apply each one:
 *   - intended_plan = 'monthly' → 30-day free subscription (gateway='manual')
 *   - intended_plan = 'yearly'  → 365-day free subscription (gateway='manual')
 *   - intended_course_id (legacy) → single-course enrollment
 *
 * Both branches are idempotent — subscription extension stacks; enrollment
 * upserts on (user_id, course_id). Errors are swallowed so a bad invite
 * never blocks a valid signin.
 */
async function applyPendingInvites() {
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

    // Lazy import to avoid pulling the admin actions module into the
    // edge-runtime bundle unless we actually need it.
    const { grantManualSubscription } = await import(
      '@/app/admin/students/invite/actions'
    );

    for (const inv of invites) {
      if (inv.intended_plan === 'monthly' || inv.intended_plan === 'yearly') {
        await grantManualSubscription(service, user.id, inv.intended_plan);
      }

      // Legacy: previous version of this feature stored a single course
      // enrollment intent here instead of a subscription. Honour it.
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
    console.error('[auth-callback] pending_invites processing failed', err);
  }
}
