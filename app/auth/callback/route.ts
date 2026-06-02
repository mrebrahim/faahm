import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyPendingInvitesForCurrentUser } from '@/lib/invites';
import { resolveAppUrl } from '@/lib/app-url';

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
  const { searchParams } = new URL(request.url);
  // Behind Coolify/Traefik, `new URL(request.url).origin` returns the
  // internal host (e.g. http://localhost:3000) because that's how
  // Next.js sees the incoming request. Use resolveAppUrl() so emails
  // and redirects always carry the public hostname.
  const origin = resolveAppUrl();
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Password-recovery flow: exchange server-side so the recovery
  // session lands in cookies the client can read. Doing the exchange
  // on the client failed in production because the PKCE code_verifier
  // cookie set during /reset-password (server action) wasn't always
  // visible to the browser client at exchange time. After a successful
  // exchange, updateUser({password}) works without needing the code.
  if (next === '/reset-password' && code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/reset-password?error=${encodeURIComponent(
          'اللينك ده مش صالح أو منتهي. اطلب لينك جديد من صفحة "نسيت كلمة السر".'
        )}`
      );
    }
    return NextResponse.redirect(`${origin}/reset-password?recovered=1`);
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
