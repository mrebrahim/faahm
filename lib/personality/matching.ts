import type { CatalogCourse } from '@/lib/career/matching';
import type { PersonalityResult } from './types';
import { isLowConfidence } from './scoring';
import { getType } from './personality-types';

const PROMPT_FUNDAMENTALS_SLUG = 'prompt-fundamentals';
const DISCOVER_PASSION_SLUG = 'discover-your-passion';

/** Type-group → preferred course slugs per PRD §6. */
const GROUP_PREFERENCES: Record<string, string[]> = {
  analysts: ['vibe-coding', 'n8n'],
  diplomats: ['ai-video', 'discover-your-passion'],
  sentinels: ['productivity-mastery', 'n8n'],
  explorers: ['vibe-coding', 'ai-video'],
};

export type PersonalityMatch = {
  primary: CatalogCourse | null;
  alsoExplore: CatalogCourse[];
  addOn: CatalogCourse | null;
  lowConfidence: boolean;
};

/**
 * Pick courses for a given personality. Unlike the career matcher this
 * is mostly a lookup, not a scoring loop — the type-group → course
 * mapping in the PRD is authoritative. We only fall back to the
 * scoring-based rationale when the type's preferred courses aren't in
 * the live catalog (e.g. an admin unpublished one).
 */
export function matchCoursesForPersonality(
  catalog: CatalogCourse[],
  result: PersonalityResult
): PersonalityMatch {
  const type = getType(result.code);
  if (!type || catalog.length === 0) {
    return { primary: null, alsoExplore: [], addOn: null, lowConfidence: false };
  }
  const lowConfidence = isLowConfidence(result);
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));

  // Borderline result → discover-your-passion as primary per honesty rule.
  if (lowConfidence) {
    const primary = bySlug.get(DISCOVER_PASSION_SLUG) ?? catalog[0];
    const fillers = catalog
      .filter((c) => c.id !== primary.id)
      .slice(0, 2);
    const promptCourse = bySlug.get(PROMPT_FUNDAMENTALS_SLUG);
    const addOn = promptCourse && primary.id !== promptCourse.id && !fillers.some((c) => c.id === promptCourse.id)
      ? promptCourse
      : null;
    return { primary, alsoExplore: fillers, addOn, lowConfidence };
  }

  const preferred = GROUP_PREFERENCES[type.group] || [];
  const ordered = preferred.map((slug) => bySlug.get(slug)).filter(Boolean) as CatalogCourse[];

  const primary = ordered[0] ?? catalog[0];
  // Fill alsoExplore with whatever's left of the preferred list, then
  // top up from the rest of the catalog so we always show ~2 chips.
  const taken = new Set([primary.id]);
  const alsoExplore: CatalogCourse[] = [];
  for (const c of ordered.slice(1)) {
    if (!taken.has(c.id)) {
      alsoExplore.push(c);
      taken.add(c.id);
    }
    if (alsoExplore.length === 2) break;
  }
  if (alsoExplore.length < 2) {
    for (const c of catalog) {
      if (!taken.has(c.id) && c.slug !== PROMPT_FUNDAMENTALS_SLUG) {
        alsoExplore.push(c);
        taken.add(c.id);
      }
      if (alsoExplore.length === 2) break;
    }
  }

  const promptCourse = bySlug.get(PROMPT_FUNDAMENTALS_SLUG);
  const addOn =
    promptCourse && !taken.has(promptCourse.id) ? promptCourse : null;

  return { primary, alsoExplore, addOn, lowConfidence };
}
