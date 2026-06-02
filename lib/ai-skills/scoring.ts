import type {
  AISkillsAnswer,
  AISkillsResult,
  LevelId,
  LevelNumber,
  LevelScores,
} from './types';
import { AI_SKILLS_QUESTIONS } from './questions';
import { LEVEL_NUMBER_OF } from './types';

const LEVEL_ORDER: LevelId[] = ['awareness', 'prompting', 'tooling', 'building'];

/** Clear threshold per rung (60% of available points). */
const CLEAR_THRESHOLD = 0.6;

/**
 * Two-step tally:
 *   1. Sum answer values per level. Each answer is 0..3 so a level
 *      with N questions has a 3N max.
 *   2. Walk the ladder bottom-up: a level is 'cleared' once its
 *      percentage clears CLEAR_THRESHOLD. The result level is the
 *      highest contiguous cleared rung; firstGapLevel is the lowest
 *      uncleared rung (the catch-up target).
 *
 * If the student doesn't even clear level 1, we still report level 1
 * — the recommendation is then 'start with prompt-fundamentals' which
 * is the right step in any case.
 */
export function tally(answers: AISkillsAnswer[]): AISkillsResult {
  const byId = new Map(AI_SKILLS_QUESTIONS.map((q) => [q.id, q]));
  const totals: Record<LevelId, { points: number; max: number }> = {
    awareness: { points: 0, max: 0 },
    prompting: { points: 0, max: 0 },
    tooling: { points: 0, max: 0 },
    building: { points: 0, max: 0 },
  };
  for (const q of AI_SKILLS_QUESTIONS) {
    totals[q.level].max += 3;
  }
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (a.value < 0 || a.value > 3) continue;
    totals[q.level].points += a.value;
  }

  const scores = {} as LevelScores;
  for (const id of LEVEL_ORDER) {
    const t = totals[id];
    scores[id] = {
      points: t.points,
      max: t.max,
      pct: t.max > 0 ? t.points / t.max : 0,
    };
  }

  let cleared: LevelId = 'awareness';
  let firstGap: LevelId | null = null;
  for (const id of LEVEL_ORDER) {
    if (scores[id].pct >= CLEAR_THRESHOLD) {
      cleared = id;
    } else {
      firstGap = id;
      break;
    }
  }

  const levelNum = LEVEL_NUMBER_OF[cleared];
  const firstGapLevel = firstGap ? LEVEL_NUMBER_OF[firstGap] : null;

  return {
    level: levelNum as LevelNumber,
    levelId: cleared,
    firstGapLevel,
    scores,
  };
}
