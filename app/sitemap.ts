import type { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import { CANONICAL_URL } from '@/lib/constants';

/**
 * sitemap.xml — Next.js generates this from the metadata route below.
 *
 * Index strategy: publish everything an anonymous visitor can usefully
 * land on (marketing pages + published course detail pages). Keep
 * auth-only, transactional, and admin URLs out — they're already
 * blocked in robots.ts but the sitemap is also where Search Console
 * pulls signals from, so don't muddy it.
 *
 * Priorities are relative weights for the same domain. Homepage and
 * pricing top the list because they're conversion-critical; legal
 * pages sit at 0.3 so they're indexed but don't compete with content.
 */
/**
 * Cache for one hour. Courses don't flip published status faster than
 * that, and a fresh DB read per crawl would be wasteful. We don't use
 * force-dynamic because it conflicts with revalidate and Google likes
 * the sitemap to serve straight static XML, not a runtime render.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${CANONICAL_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${CANONICAL_URL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${CANONICAL_URL}/courses`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${CANONICAL_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${CANONICAL_URL}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${CANONICAL_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${CANONICAL_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${CANONICAL_URL}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${CANONICAL_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${CANONICAL_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${CANONICAL_URL}/refund`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Pull every published course so /course/{slug} pages get crawled the
  // moment they ship. Service client bypasses RLS (safe — these rows
  // are public-readable anyway via is_published=true).
  let courseEntries: MetadataRoute.Sitemap = [];
  try {
    const service = createServiceClient();
    const { data: courses } = await service
      .from('courses')
      .select('slug, updated_at')
      .eq('is_published', true);
    courseEntries = (courses || []).map((c: { slug: string; updated_at: string | null }) => ({
      url: `${CANONICAL_URL}/course/${c.slug}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // Sitemap should never 500 the build/runtime — fall back to static
    // entries if the DB read blows up.
  }

  return [...staticEntries, ...courseEntries];
}
