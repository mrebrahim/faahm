import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Sign out the current user.
 * Supports both POST (from forms) and GET (so you can just visit /auth/signout)
 */
async function handleSignout(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}

export const GET = handleSignout;
export const POST = handleSignout;
