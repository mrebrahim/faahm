import type { CatalogCourse } from '@/lib/career/matching';
import type { AISkillsResult, LevelNumber } from './types';

/**
 * Course recommendation per PRD §2:
 *   Level 1 → prompt-fundamentals (always; the entry rung)
 *   Level 2 → ai-video / vibe-coding intro (prompt-fundamentals as add-on)
 *   Level 3 → vibe-coding / n8n
 *   Level 4 → n8n (advanced) + 'go deep' — surface vibe-coding too
 *
 * The matcher returns *both* the primary (the next concrete step) and
 * an 'also explore' set so the student sees the path beyond their
 * immediate gap.
 */
const PROMPT_FUNDAMENTALS = 'prompt-fundamentals';
const AI_VIDEO = 'ai-video';
const VIBE_CODING = 'vibe-coding';
const N8N = 'n8n';
const PRODUCTIVITY = 'productivity-mastery';

const PRIMARY_BY_LEVEL: Record<LevelNumber, string> = {
  1: PROMPT_FUNDAMENTALS,
  2: AI_VIDEO,
  3: VIBE_CODING,
  4: N8N,
};

const SECONDARY_BY_LEVEL: Record<LevelNumber, string[]> = {
  1: [AI_VIDEO, VIBE_CODING],
  2: [VIBE_CODING, N8N],
  3: [N8N, AI_VIDEO],
  4: [VIBE_CODING, PRODUCTIVITY],
};

export type AISkillsMatch = {
  primary: CatalogCourse | null;
  alsoExplore: CatalogCourse[];
  /** prompt-fundamentals when level > 1 and not already in the picks. */
  addOn: CatalogCourse | null;
};

export function matchCoursesForSkills(
  catalog: CatalogCourse[],
  result: AISkillsResult
): AISkillsMatch {
  if (catalog.length === 0) {
    return { primary: null, alsoExplore: [], addOn: null };
  }
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));

  const primary =
    bySlug.get(PRIMARY_BY_LEVEL[result.level]) ?? catalog[0];

  const taken = new Set<string>([primary.id]);
  const alsoExplore: CatalogCourse[] = [];
  for (const slug of SECONDARY_BY_LEVEL[result.level]) {
    const c = bySlug.get(slug);
    if (!c || taken.has(c.id)) continue;
    alsoExplore.push(c);
    taken.add(c.id);
    if (alsoExplore.length === 2) break;
  }
  // Top up if a recommended secondary is missing from the live catalog.
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

  // Prompt fundamentals as the universal add-on when not already primary
  // and not in alsoExplore. Doesn't fire at level 1 (it's primary there).
  const promptCourse = bySlug.get(PROMPT_FUNDAMENTALS);
  const addOn =
    promptCourse && !taken.has(promptCourse.id) ? promptCourse : null;

  return { primary, alsoExplore, addOn };
}
