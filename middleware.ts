import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { captureAttribution } from '@/lib/attribution';

export async function middleware(request: NextRequest) {
  // Attribution rides on whatever response the session layer returns
  // (including its redirects), so a utm link to a protected page still
  // records the channel before bouncing to /login.
  return captureAttribution(request, await updateSession(request));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Image files (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
