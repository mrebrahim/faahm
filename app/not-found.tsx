import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Global 404 handler. Anything that didn't match a route file or one of
 * the next.config redirects lands here. Push the visitor on instead of
 * stranding them: logged-in users go to the dashboard (their natural
 * starting point), everyone else goes to the homepage where they can
 * either sign up or hit the funnel.
 *
 * 307 is the right code here — these URLs never existed for us, so we
 * don't want Google to treat them as 'moved permanently from /p/* to /'
 * and lock in the redirect. The genuine permanent rewrites for known
 * legacy patterns (subscriptions, course slugs, etc.) live in
 * next.config.js with permanent:true (308).
 */
export default async function NotFound() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? '/dashboard' : '/');
}
