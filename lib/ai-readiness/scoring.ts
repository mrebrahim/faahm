import type {
  AIReadinessAnswer,
  AIReadinessResult,
  BandId,
  Dimension,
  DimensionScores,
} from './types';
import { DIMENSIONS, DIMENSION_WEIGHTS } from './types';
import { AI_READINESS_QUESTIONS } from './questions';

/**
 * Compute per-dimension averages, then weight per PRD §3:
 *   25% task · 15% digital · 20% AI use · 20% moat · 15% adapt · 5% mindset
 *
 * Weights mean every dimension counts proportionally regardless of how
 * many questions sit underneath it — so we can add depth questions to
 * any dimension later without rebalancing the final score.
 */
export function tally(answers: AIReadinessAnswer[]): AIReadinessResult {
  const byId = new Map(AI_READINESS_QUESTIONS.map((q) => [q.id, q]));
  const totals: Record<Dimension, { raw: number; max: number }> = {
    task_composition: { raw: 0, max: 0 },
    digital_exposure: { raw: 0, max: 0 },
    ai_leverage: { raw: 0, max: 0 },
    economic_moat: { raw: 0, max: 0 },
    adaptation: { raw: 0, max: 0 },
    mindset: { raw: 0, max: 0 },
  };
  for (const q of AI_READINESS_QUESTIONS) totals[q.dimension].max += 3;

  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (a.value < 0 || a.value > 3) continue;
    totals[q.dimension].raw += a.value;
  }

  const dimensions = {} as DimensionScores;
  let weightedSum = 0;
  for (const d of DIMENSIONS) {
    const { raw, max } = totals[d];
    const pct = max > 0 ? raw / max : 0;
    dimensions[d] = { raw, max, pct: Math.round(pct * 100) };
    weightedSum += pct * DIMENSION_WEIGHTS[d];
  }
  const score = Math.round(weightedSum * 100);

  const band: BandId =
    score <= 35
      ? 'danger'
      : score <= 60
        ? 'transitioning'
        : score <= 80
          ? 'strong'
          : 'leading';

  // Stable strongest/weakest — DIMENSIONS order breaks ties.
  const strongest = DIMENSIONS.reduce(
    (top, d) => (dimensions[d].pct > dimensions[top].pct ? d : top),
    DIMENSIONS[0]
  );
  const weakest = DIMENSIONS.reduce(
    (low, d) => (dimensions[d].pct < dimensions[low].pct ? d : low),
    DIMENSIONS[0]
  );

  return { score, band, dimensions, weakest, strongest };
}
