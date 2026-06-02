import type { CatalogCourse } from '@/lib/career/matching';
import type { DomainId, EqResult } from './types';

/**
 * Soft course recommendations per PRD §3. faahm has no EQ course
 * today, so this matcher leans on:
 *   - discover-your-passion when the weakest domain is self_awareness
 *   - productivity-mastery when the weakest domain is self_regulation
 *   - prompt-fundamentals as a universal AI add-on
 * For empathy / social_skills, no course is a great fit — the matcher
 * keeps the primary at discover-your-passion and drops productivity-
 * mastery into alsoExplore as a tangentially useful habit-builder.
 *
 * The bigger payoff for this test is the cross-sells into the other
 * assessments (personality, career, self-discovery) — those happen
 * in the result UI, not here.
 */
const COURSE_FOR_WEAKEST: Record<DomainId, string> = {
  self_awareness: 'discover-your-passion',
  self_regulation: 'productivity-mastery',
  empathy: 'discover-your-passion',
  social_skills: 'discover-your-passion',
};

const PROMPT_FUNDAMENTALS = 'prompt-fundamentals';
const PRODUCTIVITY_MASTERY = 'productivity-mastery';

export type EqMatch = {
  primary: CatalogCourse | null;
  alsoExplore: CatalogCourse[];
  addOn: CatalogCourse | null;
};

export function matchCoursesForEq(
  catalog: CatalogCourse[],
  result: EqResult
): EqMatch {
  if (catalog.length === 0) {
    return { primary: null, alsoExplore: [], addOn: null };
  }
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));

  const primary =
    bySlug.get(COURSE_FOR_WEAKEST[result.weakest]) ?? catalog[0];
  const taken = new Set<string>([primary.id]);

  const alsoExplore: CatalogCourse[] = [];
  // Productivity-mastery is a useful complement for almost every EQ
  // profile because habits underpin self-regulation.
  const pm = bySlug.get(PRODUCTIVITY_MASTERY);
  if (pm && !taken.has(pm.id)) {
    alsoExplore.push(pm);
    taken.add(pm.id);
  }
  // Top up with whatever else fits — skip prompt-fundamentals here
  // (it's the explicit add-on below).
  for (const c of catalog) {
    if (alsoExplore.length >= 2) break;
    if (taken.has(c.id)) continue;
    if (c.slug === PROMPT_FUNDAMENTALS) continue;
    alsoExplore.push(c);
    taken.add(c.id);
  }
  alsoExplore.length = Math.min(alsoExplore.length, 2);

  const promptCourse = bySlug.get(PROMPT_FUNDAMENTALS);
  const addOn =
    promptCourse && !taken.has(promptCourse.id) ? promptCourse : null;

  return { primary, alsoExplore, addOn };
}
