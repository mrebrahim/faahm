'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * First-time setup for invitees: capture a password (so they can log in
 * later from any device) and optionally a display name. Trusts the
 * session cookie set by Supabase during invite acceptance.
 */
export async function completeWelcome(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/welcome');
  }

  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');
  const fullName = String(formData.get('full_name') || '').trim();

  if (password.length < 8) {
    redirect(
      '/welcome?error=' + encodeURIComponent('كلمة السر لازم تكون 8 حروف على الأقل')
    );
  }
  if (password !== confirm) {
    redirect('/welcome?error=' + encodeURIComponent('كلمتا السر مش متطابقتين'));
  }

  // updateUser runs against the cookie-bound session, so this sets the
  // password for the user who just accepted the invite.
  const { error: pwError } = await supabase.auth.updateUser({ password });
  if (pwError) {
    redirect('/welcome?error=' + encodeURIComponent(pwError.message));
  }

  // Flip the password_set flag + store the chosen name. We use the
  // service client because RLS on profiles requires auth.uid() = id for
  // self-update, and getUser() above already proved that's our user.
  const service = createServiceClient();
  await service
    .from('profiles')
    .update({
      password_set: true,
      // Only overwrite the name when the user supplied something. Default
      // value from the trigger is the email, which we don't want to keep.
      ...(fullName ? { full_name: fullName } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user!.id);

  revalidatePath('/dashboard');
  redirect('/dashboard?welcome=1');
}
