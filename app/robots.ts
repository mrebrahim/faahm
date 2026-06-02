import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/constants';

/**
 * robots.txt
 *
 * Whitelist the public marketing surface and quietly close everything
 * that only makes sense to an authenticated user (lessons, dashboard,
 * billing, etc.) or that's behind admin gating. Combined with
 * middleware-level X-Robots-Tag headers on /admin for defence in depth.
 *
 * Sitemap URL is built from the configured app URL so it follows the
 * live domain instead of a stale Vercel preview hostname.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/x-mgmt-*',
          '/api/',
          '/auth/',
          '/_next/',
          // Authenticated / per-user surfaces — no organic value, plus
          // they would all redirect to /login for anonymous crawlers.
          '/dashboard',
          '/settings',
          '/certificates',
          '/welcome',
          '/lesson/',
          '/quiz/',
          // Transactional funnel — keep out of the index so old session
          // links don't surface in search.
          '/checkout',
          '/offline/',
          '/billing/',
          '/verify',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
