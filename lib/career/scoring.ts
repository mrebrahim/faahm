import type {
  Answer,
  AssessmentResult,
  DriverCode,
  RiasecCode,
} from './types';
import { QUESTIONS, emptyScores } from './questions';

/**
 * Roll the student's answers into RIASEC + driver + work-style totals.
 * Pure function — same input always returns the same result, so the
 * client can run this and the server can re-run it for verification.
 */
export function tally(answers: Answer[]): AssessmentResult {
  const totals = emptyScores();

  for (const a of answers) {
    const q = QUESTIONS.find((x) => x.id === a.questionId);
    if (!q) continue;
    const opt = q.options[a.optionIndex];
    if (!opt) continue;

    if (opt.riasec) {
      for (const [code, weight] of Object.entries(opt.riasec)) {
        const c = code as RiasecCode;
        totals.riasec[c] += weight || 0;
      }
    }
    if (opt.drivers) {
      for (const [code, weight] of Object.entries(opt.drivers)) {
        const d = code as DriverCode;
        totals.drivers[d] += weight || 0;
      }
    }
    if (opt.workStyle) {
      if (opt.workStyle.team) totals.workStyle.team += opt.workStyle.team;
      if (opt.workStyle.flex) totals.workStyle.flex += opt.workStyle.flex;
    }
  }

  const sortedCodes = (Object.entries(totals.riasec) as [RiasecCode, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code);

  const sortedDrivers = (Object.entries(totals.drivers) as [DriverCode, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return {
    riasec: totals.riasec,
    drivers: totals.drivers,
    workStyle: totals.workStyle,
    topCodes: sortedCodes.slice(0, 2),
    dominantDriver: sortedDrivers[0]?.[0] ?? 'mastery',
  };
}

/** Total RIASEC score — used by matching to detect 'genuinely undecided'. */
export function totalRiasec(scores: Record<RiasecCode, number>): number {
  return Object.values(scores).reduce((a, b) => a + b, 0);
}

/**
 * 'Strong fit' threshold: the top RIASEC code must dominate at least
 * this share of total RIASEC points for us to recommend a non-default
 * track. Below this, the catalog matcher falls back to
 * discover-your-passion per the PRD's honesty rule.
 */
export const STRONG_FIT_THRESHOLD = 0.18;

export function isUndecided(result: AssessmentResult): boolean {
  const total = totalRiasec(result.riasec);
  if (total === 0) return true;
  const topScore = result.riasec[result.topCodes[0]];
  return topScore / total < STRONG_FIT_THRESHOLD;
}
