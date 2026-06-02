import type { CatalogCourse } from '@/lib/career/matching';
import type { ProductivityResult } from './types';

const PRODUCTIVITY_MASTERY = 'productivity-mastery';
const PROMPT_FUNDAMENTALS = 'prompt-fundamentals';
const DISCOVER_PASSION = 'discover-your-passion';

export type ProductivityMatch = {
  /** Always productivity-mastery — the direct funnel target per PRD. */
  primary: CatalogCourse | null;
  alsoExplore: CatalogCourse[];
  /** prompt-fundamentals — 'use AI to do it faster' add-on per PRD. */
  addOn: CatalogCourse | null;
  /** Whether honesty rule fired: discover-your-passion in alsoExplore. */
  routedToPassion: boolean;
};

/**
 * Primary recommendation is always productivity-mastery — PRD §4. The
 * 'low_clarity' blocker adds discover-your-passion to alsoExplore per
 * the honesty branch; other blockers fall back to a complementary
 * catalogue course so the chip strip is never empty.
 */
export function matchCoursesForProductivity(
  catalog: CatalogCourse[],
  result: ProductivityResult
): ProductivityMatch {
  if (catalog.length === 0) {
    return { primary: null, alsoExplore: [], addOn: null, routedToPassion: false };
  }
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));
  const primary = bySlug.get(PRODUCTIVITY_MASTERY) ?? catalog[0];
  const taken = new Set<string>([primary.id]);
  const alsoExplore: CatalogCourse[] = [];

  // Honesty branch: low-clarity students benefit from discover-your-passion.
  const routedToPassion = result.primary === 'low_clarity';
  if (routedToPassion) {
    const dp = bySlug.get(DISCOVER_PASSION);
    if (dp && !taken.has(dp.id)) {
      alsoExplore.push(dp);
      taken.add(dp.id);
    }
  }

  // Fill any remaining slot with the next-best catalog pick that isn't
  // the universal add-on.
  for (const c of catalog) {
    if (alsoExplore.length >= 2) break;
    if (taken.has(c.id)) continue;
    if (c.slug === PROMPT_FUNDAMENTALS) continue;
    alsoExplore.push(c);
    taken.add(c.id);
  }

  const promptCourse = bySlug.get(PROMPT_FUNDAMENTALS);
  const addOn =
    promptCourse && !taken.has(promptCourse.id) ? promptCourse : null;

  return { primary, alsoExplore, addOn, routedToPassion };
}
