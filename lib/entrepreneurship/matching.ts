import type { CatalogCourse } from '@/lib/career/matching';
import type {
  Dimension,
  EntrepreneurshipResult,
  WorkType,
} from './types';

const PROMPT_FUNDAMENTALS = 'prompt-fundamentals';
const PRODUCTIVITY_MASTERY = 'productivity-mastery';
const DISCOVER_PASSION = 'discover-your-passion';

/** Primary course per monetisation route (PRD §4 table). */
const PRIMARY_BY_WORK: Record<WorkType, string> = {
  service: 'n8n',
  product: 'vibe-coding',
  content: 'ai-video',
  unclear: DISCOVER_PASSION,
};

/**
 * Course to bring in when a particular dimension is the biggest gap.
 * Risk/sales/resourcefulness don't have a faahm course today — those
 * fall back to the band-appropriate next step (productivity-mastery
 * for habit gaps, prompt-fundamentals as the AI floor).
 */
const COURSE_FOR_GAP: Record<Dimension, string | null> = {
  risk_tolerance: null,
  self_direction: PRODUCTIVITY_MASTERY,
  resourcefulness: PROMPT_FUNDAMENTALS,
  sales_comm: null,
  skill_foundation: null, // filled by primary anyway
};

export type EntrepreneurshipMatch = {
  primary: CatalogCourse | null;
  alsoExplore: CatalogCourse[];
  /** prompt-fundamentals when not already picked (universal AI floor). */
  addOn: CatalogCourse | null;
  unclearWork: boolean;
};

export function matchCoursesForEntrepreneurship(
  catalog: CatalogCourse[],
  result: EntrepreneurshipResult
): EntrepreneurshipMatch {
  if (catalog.length === 0) {
    return { primary: null, alsoExplore: [], addOn: null, unclearWork: false };
  }
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));
  const unclearWork = result.workType === 'unclear';

  const primary =
    bySlug.get(PRIMARY_BY_WORK[result.workType]) ?? catalog[0];
  const taken = new Set<string>([primary.id]);

  const alsoExplore: CatalogCourse[] = [];

  // 1) The biggest gap's recommended course, if any.
  const gapSlug = COURSE_FOR_GAP[result.biggestGap];
  if (gapSlug) {
    const c = bySlug.get(gapSlug);
    if (c && !taken.has(c.id)) {
      alsoExplore.push(c);
      taken.add(c.id);
    }
  }

  // 2) A complementary monetisation route — so a 'service' lead also
  //    sees ai-video as a content channel, etc.
  const complementarySlug =
    result.workType === 'service'
      ? 'ai-video'
      : result.workType === 'product'
        ? 'n8n'
        : result.workType === 'content'
          ? 'vibe-coding'
          : 'n8n';
  const complementary = bySlug.get(complementarySlug);
  if (alsoExplore.length < 2 && complementary && !taken.has(complementary.id)) {
    alsoExplore.push(complementary);
    taken.add(complementary.id);
  }

  // 3) Top up from the rest of the catalog if either slot is empty.
  if (alsoExplore.length < 2) {
    for (const c of catalog) {
      if (alsoExplore.length >= 2) break;
      if (taken.has(c.id)) continue;
      if (c.slug === PROMPT_FUNDAMENTALS) continue;
      alsoExplore.push(c);
      taken.add(c.id);
    }
  }
  alsoExplore.length = Math.min(alsoExplore.length, 2);

  const promptCourse = bySlug.get(PROMPT_FUNDAMENTALS);
  const addOn =
    promptCourse && !taken.has(promptCourse.id) ? promptCourse : null;

  return { primary, alsoExplore, addOn, unclearWork };
}
