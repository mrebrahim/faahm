/**
 * Four-dichotomy personality model. Each axis runs from a positive pole
 * (E/S/T/J) to a negative pole (I/N/F/P); the sign of the cumulative
 * score after tallying picks the dominant letter.
 */
export type AxisKey = 'EI' | 'SN' | 'TF' | 'JP';
export const AXES: AxisKey[] = ['EI', 'SN', 'TF', 'JP'];

export type Pole = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

export const POSITIVE_POLE: Record<AxisKey, Pole> = {
  EI: 'E',
  SN: 'S',
  TF: 'T',
  JP: 'J',
};

export const NEGATIVE_POLE: Record<AxisKey, Pole> = {
  EI: 'I',
  SN: 'N',
  TF: 'F',
  JP: 'P',
};

export type PersonalityQuestion = {
  id: string;
  axis: AxisKey;
  /** Pole the statement loads toward — 'agree' moves the axis in this direction. */
  pole: Pole;
  text: string;
};

/** 0..4: strongly disagree → strongly agree. Maps to signed −2..+2. */
export type LikertAnswer = 0 | 1 | 2 | 3 | 4;

export type PersonalityAnswer = {
  questionId: string;
  value: LikertAnswer;
};

export type AxisScores = Record<AxisKey, number>;
export type AxisConfidences = Record<AxisKey, number>;

export type PersonalityResult = {
  /** 4-letter code, e.g. 'INTJ'. */
  code: string;
  scores: AxisScores;
  confidences: AxisConfidences;
  /** Min confidence across all four axes — used for the honesty rule. */
  minConfidence: number;
};
