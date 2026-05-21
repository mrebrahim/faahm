import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware helper to refresh Supabase session and protect routes.
 *
 * SECURITY LAYERS for admin routes:
 * 1. Admin routes (/admin/*) return 404 unless 'admin-unlock' cookie is present
 * 2. The cookie is set only by visiting a secret unlock URL (env: ADMIN_UNLOCK_PATH)
 * 3. After unlock, normal auth + role check applies
 * 4. All admin page responses include X-Robots-Tag: noindex, nofollow
 * 5. Every admin access (success or fail) logged to admin_audit_log table
 *
 * This protects /admin from:
 * - Random URL guessing (no evidence /admin exists without the cookie)
 * - Search engine indexing (noindex headers)
 * - Brute force on /admin login form (route is hidden)
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  const adminUnlockPath = process.env.ADMIN_UNLOCK_PATH || '/x-mgmt-unlock';
  const adminUnlockCookie = process.env.ADMIN_UNLOCK_COOKIE_VALUE || 'unlocked';

  // ============================================================
  // LAYER 1: Secret unlock URL — sets the admin-unlock cookie
  // ============================================================
  if (pathname === adminUnlockPath) {
    const response = NextResponse.redirect(new URL('/admin', request.url));
    response.cookies.set('admin-unlock', adminUnlockCookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return response;
  }

  // ============================================================
  // LAYER 2: Admin routes return 404 if no unlock cookie
  // ============================================================
  const isAdminRoute = pathname.startsWith('/admin');
  if (isAdminRoute) {
    const unlockCookie = request.cookies.get('admin-unlock');
    if (unlockCookie?.value !== adminUnlockCookie) {
      // Return 404 — make it look like the route doesn't exist
      return new NextResponse('Not Found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
        },
      });
    }
  }

  // ============================================================
  // LAYER 3: Normal Supabase auth flow
  // ============================================================
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/course/', '/lesson/', '/certificates', '/settings'];
  const authPaths = ['/login', '/signup'];

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuth = authPaths.some((p) => pathname.startsWith(p));

  if ((isProtected || isAdminRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuth && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Admin role check
  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      // Log the unauthorized access attempt (fire-and-forget)
      void supabase.from('admin_audit_log').insert({
        user_id: user.id,
        action: 'unauthorized_access_attempt',
        path: pathname,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

      return new NextResponse('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Log successful admin access
    void supabase.from('admin_audit_log').insert({
      user_id: user.id,
      action: 'admin_access',
      path: pathname,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });
  }

  // Add security headers to admin responses
  if (isAdminRoute) {
    supabaseResponse.headers.set(
      'X-Robots-Tag',
      'noindex, nofollow, noarchive, nosnippet, noimageindex'
    );
    supabaseResponse.headers.set('X-Frame-Options', 'DENY');
    supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  return supabaseResponse;
}
