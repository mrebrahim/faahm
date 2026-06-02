import type {
  BlockerId,
  BlockerScores,
  ProductivityAnswer,
  ProductivityResult,
} from './types';
import { BLOCKER_IDS } from './types';
import { PRODUCTIVITY_QUESTIONS } from './questions';

/**
 * Count how many times each blocker was picked. The primary is the
 * blocker with the highest count; the secondary surfaces when it's
 * within striking distance (≥ 30% of the answers). primaryShare lets
 * the UI flag 'borderline' results.
 */
export function tally(answers: ProductivityAnswer[]): ProductivityResult {
  const byId = new Map(PRODUCTIVITY_QUESTIONS.map((q) => [q.id, q]));
  const scores: BlockerScores = {
    overwhelm: 0,
    perfectionism: 0,
    distraction: 0,
    low_clarity: 0,
  };

  let answeredCount = 0;
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const opt = q.options[a.optionIndex];
    if (!opt) continue;
    scores[opt.blocker] += 1;
    answeredCount += 1;
  }

  const ranked = (BLOCKER_IDS as BlockerId[])
    .slice()
    .sort((a, b) => scores[b] - scores[a]);
  const primary = ranked[0];
  const second = ranked[1];
  // Only call it 'secondary' when it's a meaningful chunk of the result —
  // 30% of the answer pool, and within 2 of the primary.
  const secondary =
    answeredCount > 0 &&
    scores[second] >= Math.ceil(answeredCount * 0.3) &&
    scores[primary] - scores[second] <= 2
      ? second
      : null;

  const primaryShare = answeredCount > 0 ? scores[primary] / answeredCount : 0;

  return { primary, secondary, scores, primaryShare };
}
