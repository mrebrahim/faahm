import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Auth state the top nav needs: are they signed in, and are they an admin.
 *
 * The role lookup runs through the service client because `profiles` is
 * RLS-protected, and it only runs for a signed-in user — a guest gets
 * exactly the HTML they always got, so the existence of /admin is never
 * leaked publicly.
 */
export async function resolveNavAuth(): Promise<{
  signedIn: boolean;
  isAdmin: boolean;
}> {
  const {
    data: { user },
  } = await createClient().auth.getUser();

  if (!user) return { signedIn: false, isAdmin: false };

  const { data: profile } = await createServiceClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return { signedIn: true, isAdmin: profile?.role === 'admin' };
}
