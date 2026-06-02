import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyPendingInvitesForCurrentUser } from '@/lib/invites';

/**
 * Handles auth callbacks (email confirmation, OAuth, invite acceptance).
 *
 *   GET /auth/callback?code=xxx[&next=/some/path]
 *
 * Two flows in the wild:
 *   1. PKCE — Supabase appends `?code=...` and we exchange it server-side.
 *   2. Implicit — Supabase appends `#access_token=...` to the URL hash and
 *      sets a session cookie itself before redirecting here. The hash isn't
 *      sent to the server, so there's no `?code=` for us to exchange — but
 *      the user IS already authenticated via the cookie Supabase set.
 *
 * In either case, once we've done what we can, we call
 * applyPendingInvitesForCurrentUser() which is a no-op if the user isn't
 * actually authenticated. We then redirect to `next` (defaulting to
 * /dashboard). Dashboard also re-runs the invite processing as a safety net
 * so first-time hash-flow signins still get their grant applied.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Password-recovery flow: do NOT exchange the code here. The
  // /reset-password page exchanges it itself via the client and then
  // calls updateUser({password}); if we exchanged it now, the code
  // would be burned and the form would land on a stale session.
  if (next === '/reset-password' && code) {
    const url = new URL(`${origin}/reset-password`);
    url.searchParams.set('code', code);
    return NextResponse.redirect(url.toString());
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('فشل التحقق')}`
      );
    }
  }

  // Runs whether the session came via PKCE exchange or via the cookie
  // Supabase set on its /auth/v1/verify endpoint. No-op if there's no
  // active session at all.
  await applyPendingInvitesForCurrentUser();

  return NextResponse.redirect(`${origin}${next}`);
}
