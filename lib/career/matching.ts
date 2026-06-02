import type { AssessmentResult, RiasecCode } from './types';
import { isUndecided } from './scoring';

/**
 * A course as the matcher sees it — pure data, no DB. The fetch lives
 * in lib/career/catalog.server.ts so we can import this module from
 * client components without dragging next/headers along.
 */
export type CatalogCourse = {
  id: string;
  slug: string;
  title_ar: string;
  short_description_ar: string | null;
  thumbnail_url: string | null;
  riasec: RiasecCode[];
  primary_driver: string | null;
  is_published: boolean;
};

const DRIVER_BONUS = 3;
const PROMPT_FUNDAMENTALS_SLUG = 'prompt-fundamentals';
const DISCOVER_PASSION_SLUG = 'discover-your-passion';

/**
 * Score every published course against a student profile per PRD §6
 * Layer B. Returns the ranked list. Honesty rule (PRD): if the
 * student's top RIASEC code doesn't dominate, the matcher promotes
 * 'discover-your-passion' to primary.
 */
export type RankedCourse = CatalogCourse & { score: number };

export function rankCatalog(
  catalog: CatalogCourse[],
  result: AssessmentResult
): RankedCourse[] {
  const scored: RankedCourse[] = catalog.map((course) => {
    let score = 0;
    // Interest alignment: sum student.riasec * course.riasecWeight, where
    // every tagged code on the course contributes 1.0. Keeps the math
    // simple and prevents one outlier driver from dominating.
    for (const code of course.riasec) {
      score += result.riasec[code] || 0;
    }
    if (course.primary_driver && course.primary_driver === result.dominantDriver) {
      score += DRIVER_BONUS;
    }
    return { ...course, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export type MatchResult = {
  primary: RankedCourse | null;
  alsoExplore: RankedCourse[];
  addOn: RankedCourse | null;
  undecided: boolean;
};

/**
 * Final recommendation per PRD §6: primary = best fit, alsoExplore = next 2,
 * addOn = prompt-fundamentals tacked on if it's not already in the picks.
 * Honesty branch: if the result is genuinely undecided, primary becomes
 * discover-your-passion and the rest are just suggestions.
 */
export function matchCourses(
  catalog: CatalogCourse[],
  result: AssessmentResult
): MatchResult {
  if (catalog.length === 0) {
    return { primary: null, alsoExplore: [], addOn: null, undecided: false };
  }

  const ranked = rankCatalog(catalog, result);
  const undecided = isUndecided(result);

  let primary: RankedCourse | null;
  let alsoExplore: RankedCourse[];

  if (undecided) {
    const fallback =
      ranked.find((c) => c.slug === DISCOVER_PASSION_SLUG) ?? ranked[0];
    primary = fallback;
    alsoExplore = ranked.filter((c) => c.id !== fallback.id).slice(0, 2);
  } else {
    primary = ranked[0];
    alsoExplore = ranked.slice(1, 3);
  }

  // Prompt fundamentals as the universal AI add-on, unless it already
  // sits in primary or alsoExplore.
  const promptCourse = ranked.find((c) => c.slug === PROMPT_FUNDAMENTALS_SLUG);
  const promptAlreadyPicked =
    promptCourse &&
    (primary?.id === promptCourse.id ||
      alsoExplore.some((c) => c.id === promptCourse.id));
  const addOn = promptCourse && !promptAlreadyPicked ? promptCourse : null;

  return { primary, alsoExplore, addOn, undecided };
}
