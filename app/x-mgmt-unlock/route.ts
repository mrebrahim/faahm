import { NextResponse } from 'next/server';

/**
 * Admin unlock URL — sets the admin-unlock cookie and redirects to /admin.
 *
 * This is the SECRET URL that grants access to the admin panel.
 * Without visiting this URL, /admin returns 404 (via middleware).
 *
 * After this URL is visited, the browser stores the admin-unlock cookie
 * for 30 days. /admin then becomes accessible (but still requires auth + admin role).
 *
 * SECURITY: This URL itself does NOT require authentication. It only sets
 * a cookie that "unlocks" the admin route. The actual security depends on:
 * 1. The URL being secret (hidden from public UI, robots.txt)
 * 2. Admin auth + role check on /admin pages
 * 3. Eventually: Cloudflare Access on admin subdomain
 */
export async function GET(request: Request) {
  const adminUnlockCookie = process.env.ADMIN_UNLOCK_COOKIE_VALUE || 'unlocked';

  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/admin`, { status: 303 });

  response.cookies.set('admin-unlock', adminUnlockCookie, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
