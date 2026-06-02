/**
 * AI Readiness model — three scoring dimensions plus a non-scoring
 * 'work_type' signal that drives course matching.
 *
 * Each scored question contributes 0..4 points to one dimension.
 * The final 0..100 score is a weighted blend: Adoption + Skill at
 * 40% each, Exposure inverted at 20% (high exposure = low score).
 */
export type Dimension = 'adoption' | 'skill' | 'exposure';

export type WorkType = 'office' | 'tech' | 'marketing' | 'educator' | 'unclear';

export type BandId = 'high_exposure' | 'safe' | 'ahead';

/** 0..4 Likert-style answer. */
export type LikertAnswer = 0 | 1 | 2 | 3 | 4;

export type AIReadinessOption = {
  label: string;
  value: LikertAnswer;
};

export type AIReadinessQuestion =
  | {
      id: string;
      kind: 'scored';
      dimension: Dimension;
      prompt: string;
      options: AIReadinessOption[];
    }
  | {
      id: string;
      kind: 'work_type';
      prompt: string;
      options: { label: string; value: WorkType }[];
    };

export type AIReadinessAnswer = {
  questionId: string;
  /** number for scored, WorkType string for work_type. */
  value: LikertAnswer | WorkType;
};

export type DimensionScores = Record<Dimension, number>;

export type AIReadinessResult = {
  /** 0..100. */
  score: number;
  band: BandId;
  workType: WorkType;
  dimensions: DimensionScores;
};
