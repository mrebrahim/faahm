/**
 * Entrepreneurship & freelance readiness model.
 * - 5 scored dimensions, each capped at 9 pts (3 questions × 0–3) —
 *   except resourcefulness at 6 pts (2 questions). Total max = 42.
 * - 1 work_type signal question routes the primary course; not scored.
 */
export type Dimension =
  | 'risk_tolerance'
  | 'self_direction'
  | 'resourcefulness'
  | 'sales_comm'
  | 'skill_foundation';

export const DIMENSIONS: Dimension[] = [
  'risk_tolerance',
  'self_direction',
  'resourcefulness',
  'sales_comm',
  'skill_foundation',
];

export type WorkType = 'service' | 'product' | 'content' | 'unclear';

export type BandId = 'not_ready' | 'almost_ready' | 'ready_to_leap';

export type ScoredOption = { label: string; value: 0 | 1 | 2 | 3 };
export type WorkTypeOption = { label: string; value: WorkType };

export type EntrepreneurshipQuestion =
  | {
      id: string;
      kind: 'scored';
      dimension: Dimension;
      prompt: string;
      options: ScoredOption[];
    }
  | {
      id: string;
      kind: 'work_type';
      prompt: string;
      options: WorkTypeOption[];
    };

export type EntrepreneurshipAnswer = {
  questionId: string;
  /** number for scored questions, WorkType for the work_type prompt. */
  value: 0 | 1 | 2 | 3 | WorkType;
};

export type DimensionScore = {
  raw: number;
  max: number;
  /** 0..100, normalised against the dimension's max. */
  pct: number;
};

export type DimensionScores = Record<Dimension, DimensionScore>;

export type EntrepreneurshipResult = {
  /** 0..100 weighted-blend score. */
  score: number;
  band: BandId;
  workType: WorkType;
  /** Dimension with the lowest normalised % — the catch-up target. */
  biggestGap: Dimension;
  dimensions: DimensionScores;
};
