import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware: Supabase session refresh + admin route protection.
 *
 * Security model for /admin:
 * 1. Must be authenticated (logged in)
 * 2. Must have role='admin' in profiles table (verified server-side)
 * 3. Non-admins logged in get redirected to /dashboard
 * 4. Unauthenticated users get redirected to /login
 * 5. Admin pages: X-Robots-Tag headers (noindex, nofollow) — invisible to Google
 * 6. UI: no admin link visible to non-admins (and not in public navbar at all)
 * 7. robots.txt explicitly disallows /admin/*
 *
 * Audit logging: every admin access logged to admin_audit_log table.
 *
 * Phase 2 (planned): Move /admin to admin.faahm.com subdomain behind
 * Cloudflare Access (2FA + IP whitelist) for defense in depth.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

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

  // Route categories
  // /course/[slug] is public (shows CTA to non-subscribers per PRD §6.3).
  // /lesson/[id] requires auth + active sub or free-preview flag (enforced in page).
  const protectedPaths = ['/dashboard', '/lesson/', '/certificates', '/settings', '/billing'];
  const authPaths = ['/login', '/signup'];
  const isAdminRoute = pathname.startsWith('/admin');
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuth = authPaths.some((p) => pathname.startsWith(p));

  // Redirect unauthenticated users away from protected/admin routes
  if ((isProtected || isAdminRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
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
      // Not an admin — quietly send to dashboard
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Baseline security headers for every response.
  applyBaselineSecurityHeaders(supabaseResponse);

  // Stricter posture for the admin panel: no indexing, no embedding, no
  // caching, tight CSP, and a forbidding Permissions-Policy.
  if (isAdminRoute) {
    supabaseResponse.headers.set(
      'X-Robots-Tag',
      'noindex, nofollow, noarchive, nosnippet, noimageindex'
    );
    supabaseResponse.headers.set('X-Frame-Options', 'DENY');
    supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    supabaseResponse.headers.set('Pragma', 'no-cache');
    supabaseResponse.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()'
    );
    supabaseResponse.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        // Next.js inlines small scripts; Tailwind/styled-jsx inlines styles.
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        // Supabase auth + REST endpoints; nothing else.
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ].join('; ')
    );
  }

  return supabaseResponse;
}

function applyBaselineSecurityHeaders(response: NextResponse) {
  // HSTS — instruct browsers to never connect over HTTP again. Safe to
  // emit even on the preview vercel.app domain; only enforced when served
  // over HTTPS, which we always are.
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  // X-Frame-Options is overridden to DENY for admin above; the rest of the
  // site stays embeddable in same-origin contexts (Vimeo preview etc.).
  if (!response.headers.has('X-Frame-Options')) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  }
}
