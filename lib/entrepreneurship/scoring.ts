import type {
  BandId,
  Dimension,
  DimensionScore,
  DimensionScores,
  EntrepreneurshipAnswer,
  EntrepreneurshipResult,
  WorkType,
} from './types';
import { DIMENSIONS } from './types';
import { ENTREPRENEURSHIP_QUESTIONS } from './questions';

const TOTAL_MAX = 42; // 3+3+3+3+3+3+3+3+3+3+3+3+3+3 across 5 dims, capped at the table above.

/**
 * Tally per dimension, then a flat sum / TOTAL_MAX for the headline
 * score. We deliberately don't weight one dimension over another in
 * Phase 1 — every dimension is a real risk if it's missing.
 *
 * The biggest gap is the dimension with the lowest normalised %. It
 * drives the catch-up section + the second 'also explore' course.
 */
export function tally(answers: EntrepreneurshipAnswer[]): EntrepreneurshipResult {
  const byId = new Map(ENTREPRENEURSHIP_QUESTIONS.map((q) => [q.id, q]));
  const totals: Record<Dimension, { raw: number; max: number }> = {
    risk_tolerance: { raw: 0, max: 0 },
    self_direction: { raw: 0, max: 0 },
    resourcefulness: { raw: 0, max: 0 },
    sales_comm: { raw: 0, max: 0 },
    skill_foundation: { raw: 0, max: 0 },
  };
  for (const q of ENTREPRENEURSHIP_QUESTIONS) {
    if (q.kind === 'scored') totals[q.dimension].max += 3;
  }

  let workType: WorkType = 'unclear';
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (q.kind === 'scored') {
      const v = a.value as number;
      if (typeof v === 'number' && v >= 0 && v <= 3) {
        totals[q.dimension].raw += v;
      }
    } else if (q.kind === 'work_type') {
      const v = a.value as WorkType;
      if (v === 'service' || v === 'product' || v === 'content' || v === 'unclear') {
        workType = v;
      }
    }
  }

  const dimensions = {} as DimensionScores;
  let rawSum = 0;
  for (const d of DIMENSIONS) {
    const { raw, max } = totals[d];
    rawSum += raw;
    dimensions[d] = {
      raw,
      max,
      pct: max > 0 ? Math.round((raw / max) * 100) : 0,
    } satisfies DimensionScore;
  }

  const score = Math.round((rawSum / TOTAL_MAX) * 100);
  const band: BandId =
    score < 40 ? 'not_ready' : score < 70 ? 'almost_ready' : 'ready_to_leap';

  // Biggest gap: the dimension with the lowest percentage. Ties broken
  // by DIMENSIONS array order so it's stable.
  const biggestGap = DIMENSIONS.reduce(
    (lo, d) => (dimensions[d].pct < dimensions[lo].pct ? d : lo),
    DIMENSIONS[0]
  );

  return { score, band, workType, biggestGap, dimensions };
}
