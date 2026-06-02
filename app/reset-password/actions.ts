'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { auditLog } from '@/lib/admin-audit';
import { resolveAppUrl } from '@/lib/app-url';

/**
 * Step 1 of password reset: user submits their email; Supabase emails them
 * a one-time recovery link. The link lands them on /reset-password with
 * an `access_token` in the URL hash, which the client component below
 * picks up to call `updateUser({ password })`.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  if (!email) {
    redirect('/reset-password?error=' + encodeURIComponent('من فضلك أدخل البريد الإلكتروني'));
  }

  const supabase = createClient();
  const appUrl = resolveAppUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email!, {
    // Route through /auth/callback so we only need that one URL in the
    // Supabase redirect allow list — many deploys forget to whitelist
    // /reset-password and Supabase silently falls back to Site URL,
    // landing the user on the homepage. The callback passes the `code`
    // through to /reset-password without consuming it, so the client
    // form can still exchange it for a recovery session.
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });

  // Log every attempt — successful or not — but never reveal whether the
  // email exists. The UI message is always identical.
  void auditLog(
    { userId: null, userEmail: email!, userRole: null },
    {
      action: 'auth.password_reset_requested',
      result: error ? 'failure' : 'success',
      errorMessage: error?.message ?? null,
    }
  );

  // Always redirect to the "check your email" screen so attackers can't
  // enumerate registered emails by timing or response.
  redirect('/reset-password?sent=1');
}
