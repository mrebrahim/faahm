import type { MetadataRoute } from 'next';

/**
 * SEO robots.txt
 *
 * Explicitly disallow admin paths from search engine crawlers.
 * Combined with middleware-level X-Robots-Tag header for defense in depth.
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
        ],
      },
    ],
    sitemap: 'https://faahm.vercel.app/sitemap.xml',
  };
}
