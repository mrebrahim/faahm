/**
 * RIASEC axes — the six interest dimensions Holland Codes measures.
 * Used as the primary signal both for archetype assignment and for
 * matching the live faahm catalog.
 */
export type RiasecCode = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export type DriverCode =
  | 'impact'
  | 'income'
  | 'freedom'
  | 'creativity'
  | 'mastery'
  | 'stability'
  | 'self_awareness';

export type RiasecScores = Record<RiasecCode, number>;
export type DriverScores = Record<DriverCode, number>;

export type WorkStyle = {
  /** + = team-leaning, − = solo-leaning. */
  team: number;
  /** + = flex-leaning, − = structure-leaning. */
  flex: number;
};

export type QuestionOption = {
  label: string;
  riasec?: Partial<Record<RiasecCode, number>>;
  drivers?: Partial<Record<DriverCode, number>>;
  workStyle?: Partial<WorkStyle>;
};

export type Question = {
  id: string;
  prompt: string;
  /** Optional shorter hint shown under the prompt. */
  hint?: string;
  options: QuestionOption[];
};

export type Answer = {
  questionId: string;
  optionIndex: number;
};

export type AssessmentResult = {
  riasec: RiasecScores;
  drivers: DriverScores;
  workStyle: WorkStyle;
  topCodes: RiasecCode[];
  dominantDriver: DriverCode;
};
