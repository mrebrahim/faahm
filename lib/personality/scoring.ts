import type {
  AxisConfidences,
  AxisKey,
  AxisScores,
  PersonalityAnswer,
  PersonalityResult,
} from './types';
import { AXES, NEGATIVE_POLE, POSITIVE_POLE } from './types';
import { PERSONALITY_QUESTIONS } from './questions';

/**
 * Aggregate Likert answers into a signed score per axis. Convention:
 * positive total → A-pole letter (E/S/T/J), negative → B-pole (I/N/F/P).
 *
 * Each answer in 0..4 → signed −2..+2. Statements pointing at the
 * positive pole add the signed value directly; statements pointing at
 * the negative pole flip the sign. Confidence is the unsigned axis
 * total normalised against the theoretical max (8 statements × 2).
 */
export function tally(answers: PersonalityAnswer[]): PersonalityResult {
  const byId = new Map(PERSONALITY_QUESTIONS.map((q) => [q.id, q]));
  const scores: AxisScores = { EI: 0, SN: 0, TF: 0, JP: 0 };

  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (a.value < 0 || a.value > 4) continue;
    const signed = a.value - 2; // -2..+2
    const positive = q.pole === POSITIVE_POLE[q.axis];
    scores[q.axis] += positive ? signed : -signed;
  }

  const confidences: AxisConfidences = { EI: 0, SN: 0, TF: 0, JP: 0 };
  for (const axis of AXES) {
    confidences[axis] = Math.min(1, Math.abs(scores[axis]) / 16);
  }

  const code = AXES.map((axis) =>
    scores[axis] >= 0 ? POSITIVE_POLE[axis] : NEGATIVE_POLE[axis]
  ).join('');

  const minConfidence = Math.min(...AXES.map((a) => confidences[a]));

  return { code, scores, confidences, minConfidence };
}

/**
 * Borderline-type threshold per PRD §6 honesty rule. If the weakest
 * axis confidence is below this, the matcher routes to
 * discover-your-passion and the report says the type isn't strongly
 * defined.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.18;

export function isLowConfidence(result: PersonalityResult): boolean {
  return result.minConfidence < LOW_CONFIDENCE_THRESHOLD;
}
