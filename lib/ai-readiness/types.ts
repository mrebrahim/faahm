/**
 * 6-dimension AI readiness model (depth rebuild — Aug 2026 PRD).
 *
 * Risk equation per PRD:
 *   risk = (task_automation × digital_exposure)
 *        − (real_ai_use + economic_moat + adaptation + mindset)
 *
 * Each scored question answers 0..3, where 3 = better readiness
 * (lower risk) regardless of whether the dimension protects or
 * exposes. The dimension weighting flips happens in scoring, not
 * in the option scale, so question authoring stays uniform.
 */
export type Dimension =
  | 'task_composition'    // 25% — repetitive vs judgment work
  | 'digital_exposure'    // 15% — screen-only vs physical/human
  | 'ai_leverage'         // 20% — actual usage, not knowledge
  | 'economic_moat'       // 20% — what protects you economically
  | 'adaptation'          // 15% — how fast you learn / adopt
  | 'mindset';            // 5%  — threat vs opportunity framing

export const DIMENSIONS: Dimension[] = [
  'task_composition',
  'digital_exposure',
  'ai_leverage',
  'economic_moat',
  'adaptation',
  'mindset',
];

/** Weighting per PRD §3 — sums to 1.0. */
export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  task_composition: 0.25,
  digital_exposure: 0.15,
  ai_leverage: 0.2,
  economic_moat: 0.2,
  adaptation: 0.15,
  mindset: 0.05,
};

/** 0..3 — least to most ready. */
export type AnswerValue = 0 | 1 | 2 | 3;

export type AIReadinessOption = {
  label: string;
  value: AnswerValue;
};

export type AIReadinessQuestion = {
  id: string;
  dimension: Dimension;
  prompt: string;
  options: AIReadinessOption[];
};

export type AIReadinessAnswer = {
  questionId: string;
  value: AnswerValue;
};

export type DimensionScore = { raw: number; max: number; pct: number };
export type DimensionScores = Record<Dimension, DimensionScore>;

export type BandId = 'danger' | 'transitioning' | 'strong' | 'leading';

export type AIReadinessResult = {
  /** Weighted 0..100. */
  score: number;
  band: BandId;
  dimensions: DimensionScores;
  /** Dimension with the lowest normalised %. */
  weakest: Dimension;
  /** Dimension with the highest normalised %. */
  strongest: Dimension;
};
