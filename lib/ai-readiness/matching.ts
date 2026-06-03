import type { CatalogCourse } from '@/lib/career/matching';
import type { AIReadinessResult, BandId, Dimension } from './types';

/**
 * Band → primary course slug per PRD §4. The catch-up plan is band-
 * specific because the right *next step* changes shape across the
 * ladder:
 *   - danger   → foundations (prompt-fundamentals)
 *   - transit  → start using AI on real work (ai-video as accessible entry)
 *   - strong   → build with AI (vibe-coding)
 *   - leading  → automate at scale + teach (n8n)
 */
const PRIMARY_BY_BAND: Record<BandId, string> = {
  danger: 'prompt-fundamentals',
  transitioning: 'ai-video',
  strong: 'vibe-coding',
  leading: 'n8n',
};

/**
 * Secondary chips per band — what the student should pick next after
 * the primary.
 */
const SECONDARY_BY_BAND: Record<BandId, string[]> = {
  danger: ['productivity-mastery', 'ai-video'],
  transitioning: ['vibe-coding', 'n8n'],
  strong: ['n8n', 'ai-video'],
  leading: ['vibe-coding', 'productivity-mastery'],
};

/** Per-dimension nudge course when that dimension is the student's weakest. */
const COURSE_FOR_WEAKEST: Partial<Record<Dimension, string>> = {
  task_composition: 'productivity-mastery',
  ai_leverage: 'prompt-fundamentals',
  adaptation: 'productivity-mastery',
};

const PROMPT_FUNDAMENTALS = 'prompt-fundamentals';

export type AIReadinessMatch = {
  primary: CatalogCourse | null;
  alsoExplore: CatalogCourse[];
  addOn: CatalogCourse | null;
};

export function matchCoursesForReadiness(
  catalog: CatalogCourse[],
  result: AIReadinessResult
): AIReadinessMatch {
  if (catalog.length === 0) {
    return { primary: null, alsoExplore: [], addOn: null };
  }
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));
  const primary = bySlug.get(PRIMARY_BY_BAND[result.band]) ?? catalog[0];
  const taken = new Set<string>([primary.id]);
  const alsoExplore: CatalogCourse[] = [];

  // 1) Pull the band-specific complements.
  for (const slug of SECONDARY_BY_BAND[result.band]) {
    const c = bySlug.get(slug);
    if (!c || taken.has(c.id)) continue;
    alsoExplore.push(c);
    taken.add(c.id);
    if (alsoExplore.length === 2) break;
  }

  // 2) If the weakest dimension has its own nudge course and we still
  //    have a slot, inject it (covers cases where the band suggests
  //    advanced courses but a specific weakness needs targeted help).
  if (alsoExplore.length < 2) {
    const slug = COURSE_FOR_WEAKEST[result.weakest];
    if (slug) {
      const c = bySlug.get(slug);
      if (c && !taken.has(c.id)) {
        alsoExplore.push(c);
        taken.add(c.id);
      }
    }
  }

  // 3) Top up from the catalog if slots are still open.
  if (alsoExplore.length < 2) {
    for (const c of catalog) {
      if (alsoExplore.length >= 2) break;
      if (taken.has(c.id)) continue;
      if (c.slug === PROMPT_FUNDAMENTALS) continue;
      alsoExplore.push(c);
      taken.add(c.id);
    }
  }

  const promptCourse = bySlug.get(PROMPT_FUNDAMENTALS);
  const addOn =
    promptCourse && !taken.has(promptCourse.id) ? promptCourse : null;

  return { primary, alsoExplore, addOn };
}
