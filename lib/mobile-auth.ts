import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Auth for the mobile app's API calls.
 *
 * The app signs in against Supabase directly (email OTP / password) and
 * holds a normal Supabase session. Every call to /api/mobile/* carries
 * that session's access token as `Authorization: Bearer <jwt>`, and this
 * helper verifies it against Supabase's auth server.
 *
 * Deliberately NOT cookie-based: the web app's cookie session is
 * origin-bound and useless from a native client, and passing the
 * service key anywhere near the device is out of the question.
 */
export type MobileUser = { id: string; email: string | null };

export async function getMobileUser(request: Request): Promise<MobileUser | null> {
  const header = request.headers.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : '';
  if (!token) return null;

  // A bare anon client — getUser(token) asks Supabase to validate the
  // JWT signature and expiry for us, so a forged or stale token fails
  // here rather than reaching any query.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return { id: user.id, email: user.email ?? null };
}

export function unauthorized() {
  return Response.json(
    { error: 'unauthorized', message: 'محتاج تسجّل دخول الأول.' },
    { status: 401 }
  );
}

export function jsonError(message: string, status = 400, code = 'bad_request') {
  return Response.json({ error: code, message }, { status });
}
