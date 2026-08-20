import { createClient, createServiceClient } from '@/lib/supabase/server';
import { MainNav } from '@/components/main-nav';

/**
 * Server wrapper that resolves auth once and hands MainNav its props.
 *
 * MainNav is a client component (it owns the mobile drawer state), so it
 * can't read the session itself. Every page that wants the site header
 * was otherwise duplicating this lookup.
 */
export async function SiteNav() {
  const {
    data: { user },
  } = await createClient().auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await createServiceClient()
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
  }

  return <MainNav signedIn={!!user} isAdmin={isAdmin} />;
}
