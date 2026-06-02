import type { CatalogCourse } from '@/lib/career/matching';
import type { AIReadinessResult, WorkType } from './types';

/**
 * Primary course slug per work_type per PRD §5.
 * 'unclear' triggers the honesty rule → discover-your-passion.
 */
const PRIMARY_BY_WORK: Record<WorkType, string> = {
  office: 'n8n',
  tech: 'vibe-coding',
  marketing: 'ai-video',
  educator: 'ai-video',
  unclear: 'discover-your-passion',
};

const PROMPT_FUNDAMENTALS = 'prompt-fundamentals';
const PRODUCTIVITY_MASTERY = 'productivity-mastery';
const DISCOVER_PASSION = 'discover-your-passion';

export type AIReadinessMatch = {
  primary: CatalogCourse | null;
  alsoExplore: CatalogCourse[];
  addOn: CatalogCourse | null;
  unclearWork: boolean;
};

/**
 * Pick courses for the student. Primary comes from work_type. The
 * 'also explore' fillers depend on the band:
 *   - high_exposure: lean operational — productivity-mastery, n8n
 *     (catch-up plan that compounds quickly).
 *   - safe: any other published course that fits the work_type cluster.
 *   - ahead: the deeper / build-focused courses (vibe-coding, ai-video)
 *     that take advantage of their existing fluency.
 * prompt-fundamentals is the universal add-on unless already picked.
 */
export function matchCoursesForReadiness(
  catalog: CatalogCourse[],
  result: AIReadinessResult
): AIReadinessMatch {
  if (catalog.length === 0) {
    return { primary: null, alsoExplore: [], addOn: null, unclearWork: false };
  }
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));
  const unclearWork = result.workType === 'unclear';

  const primarySlug = PRIMARY_BY_WORK[result.workType];
  const primary = bySlug.get(primarySlug) ?? catalog[0];

  const taken = new Set<string>([primary.id]);
  const pushSlug = (slug: string, arr: CatalogCourse[]) => {
    const c = bySlug.get(slug);
    if (!c || taken.has(c.id)) return;
    arr.push(c);
    taken.add(c.id);
  };

  const alsoExplore: CatalogCourse[] = [];
  // Band-specific 'also explore' picks per PRD's catch-up framing.
  if (result.band === 'high_exposure') {
    pushSlug(PRODUCTIVITY_MASTERY, alsoExplore);
    pushSlug('n8n', alsoExplore);
  } else if (result.band === 'ahead') {
    pushSlug('vibe-coding', alsoExplore);
    pushSlug('ai-video', alsoExplore);
  } else {
    // 'safe' — recommend a complementary course outside the primary's
    // bucket so they widen their toolkit.
    if (primarySlug !== 'n8n') pushSlug('n8n', alsoExplore);
    if (primarySlug !== 'ai-video') pushSlug('ai-video', alsoExplore);
  }
  // Top up from the rest of the catalog if either band-specific pick
  // wasn't in the live catalog.
  if (alsoExplore.length < 2) {
    for (const c of catalog) {
      if (!taken.has(c.id) && c.slug !== PROMPT_FUNDAMENTALS) {
        alsoExplore.push(c);
        taken.add(c.id);
      }
      if (alsoExplore.length === 2) break;
    }
  }
  // Cap at 2.
  alsoExplore.length = Math.min(alsoExplore.length, 2);

  // Universal AI foundation.
  const promptCourse = bySlug.get(PROMPT_FUNDAMENTALS);
  const addOn =
    promptCourse && !taken.has(promptCourse.id) ? promptCourse : null;

  // Honesty rule: if work_type is 'unclear', we already routed primary
  // to discover-your-passion. Make sure it stays present.
  if (unclearWork && primary.slug !== DISCOVER_PASSION) {
    const dp = bySlug.get(DISCOVER_PASSION);
    if (dp) {
      // Bubble it up into alsoExplore if not already there.
      if (!taken.has(dp.id)) {
        alsoExplore.unshift(dp);
        alsoExplore.length = 2;
      }
    }
  }

  return { primary, alsoExplore, addOn, unclearWork };
}
