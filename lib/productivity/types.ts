/**
 * Four procrastination blockers (PRD §2). Every question option loads
 * one of these; the dominant blocker is the result.
 */
export type BlockerId =
  | 'overwhelm'
  | 'perfectionism'
  | 'distraction'
  | 'low_clarity';

export const BLOCKER_IDS: BlockerId[] = [
  'overwhelm',
  'perfectionism',
  'distraction',
  'low_clarity',
];

export type BlockerScores = Record<BlockerId, number>;

export type ProductivityOption = {
  label: string;
  blocker: BlockerId;
};

export type ProductivityQuestion = {
  id: string;
  prompt: string;
  options: ProductivityOption[];
};

export type ProductivityAnswer = {
  questionId: string;
  optionIndex: number;
};

export type ProductivityResult = {
  primary: BlockerId;
  secondary: BlockerId | null;
  scores: BlockerScores;
  /** Spread: how much of the answers the primary blocker won by. 0..1. */
  primaryShare: number;
};
