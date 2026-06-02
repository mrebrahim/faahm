import type { CatalogCourse } from '@/lib/career/matching';
import type { SelfDiscoveryResult, ThemeId } from './types';

/**
 * Theme → secondary course slug per PRD §5. Discover-your-passion is
 * always the primary (the entire test funnels into it), so this map
 * only drives 'also explore' picks.
 */
const THEME_TO_SECONDARY: Record<ThemeId, string> = {
  building: 'vibe-coding',
  creating: 'ai-video',
  execution: 'productivity-mastery',
  mastery: 'prompt-fundamentals',
  impact: 'ai-video',
};

const PROMPT_FUNDAMENTALS = 'prompt-fundamentals';
const DISCOVER_PASSION = 'discover-your-passion';

export type SelfDiscoveryMatch = {
  /** Always discover-your-passion when it's in the catalog. */
  primary: CatalogCourse | null;
  alsoExplore: CatalogCourse[];
  /** prompt-fundamentals when not already picked as primary or alsoExplore. */
  addOn: CatalogCourse | null;
};

export function matchCoursesForSelfDiscovery(
  catalog: CatalogCourse[],
  result: SelfDiscoveryResult
): SelfDiscoveryMatch {
  if (catalog.length === 0) {
    return { primary: null, alsoExplore: [], addOn: null };
  }
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));

  const primary = bySlug.get(DISCOVER_PASSION) ?? catalog[0];
  const taken = new Set<string>([primary.id]);

  const alsoExplore: CatalogCourse[] = [];
  for (const theme of result.top) {
    const slug = THEME_TO_SECONDARY[theme];
    const c = bySlug.get(slug);
    if (c && !taken.has(c.id)) {
      alsoExplore.push(c);
      taken.add(c.id);
    }
    if (alsoExplore.length === 2) break;
  }

  // Top up if the top themes' courses weren't enough — covers the case
  // where a recommended course is unpublished or matches the primary.
  if (alsoExplore.length < 2) {
    for (const c of catalog) {
      if (!taken.has(c.id) && c.slug !== PROMPT_FUNDAMENTALS) {
        alsoExplore.push(c);
        taken.add(c.id);
      }
      if (alsoExplore.length === 2) break;
    }
  }
  alsoExplore.length = Math.min(alsoExplore.length, 2);

  const promptCourse = bySlug.get(PROMPT_FUNDAMENTALS);
  const addOn = promptCourse && !taken.has(promptCourse.id) ? promptCourse : null;

  return { primary, alsoExplore, addOn };
}
