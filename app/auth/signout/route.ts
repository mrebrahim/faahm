import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/admin-audit';

/**
 * Sign out the current user.
 * Supports POST (from forms) and GET (just visit /auth/signout).
 *
 *   ?scope=global  → revoke every refresh token for the user, on every
 *                    device. Implemented via the admin API since
 *                    supabase.auth.signOut() only kills the current cookie.
 */
async function handleSignout(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Capture identity BEFORE signOut() invalidates the session.
    const ctx = { userId: user.id, userEmail: user.email ?? null, userRole: null };

    if (scope === 'global') {
      try {
        const service = createServiceClient();
        // Revoke all refresh tokens for this user across every device.
        await service.auth.admin.signOut(user.id, 'global');
        void auditLog(ctx, { action: 'auth.signout_all_devices' });
      } catch (err) {
        void auditLog(ctx, {
          action: 'auth.signout_all_devices',
          result: 'failure',
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      void auditLog(ctx, { action: 'auth.signout' });
    }
  }

  await supabase.auth.signOut();
  // Use NEXT_PUBLIC_APP_URL as the canonical base so signout always lands on
  // the configured app domain (e.g. http://localhost:3000 in dev, or the
  // production domain in prod) rather than whatever hostname the request
  // came in on. This matters behind reverse proxies (Coolify, Vercel
  // preview URLs, sslip.io, etc.) where url.origin would point at the
  // proxy host.
  const base = (process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/$/, '');
  return NextResponse.redirect(`${base}/login`, { status: 303 });
}

export const GET = handleSignout;
export const POST = handleSignout;
