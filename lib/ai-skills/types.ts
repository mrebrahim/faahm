/**
 * 4-rung skill ladder. Each question is tagged with the level it
 * probes; the result is the *highest* level cleared, plus the first
 * unmet rung which becomes the catch-up target.
 */
export type LevelNumber = 1 | 2 | 3 | 4;

export type LevelId = 'awareness' | 'prompting' | 'tooling' | 'building';

export const LEVEL_NUMBER_OF: Record<LevelId, LevelNumber> = {
  awareness: 1,
  prompting: 2,
  tooling: 3,
  building: 4,
};

/** 0..3 — none / sort_of / partial / yes. */
export type SkillAnswerValue = 0 | 1 | 2 | 3;

export const SKILL_OPTION_LABELS = [
  'لأ خالص',
  'شوية / مش متأكد',
  'إلى حد ما',
  'أيوة، بثقة',
] as const;

export type AISkillsQuestion = {
  id: string;
  level: LevelId;
  prompt: string;
  /** Optional custom option labels per question (defaults to SKILL_OPTION_LABELS). */
  options?: readonly string[];
};

export type AISkillsAnswer = {
  questionId: string;
  value: SkillAnswerValue;
};

export type LevelScores = Record<LevelId, { points: number; max: number; pct: number }>;

export type AISkillsResult = {
  /** Highest cleared level (1..4). Defaults to 1 when nothing clears. */
  level: LevelNumber;
  levelId: LevelId;
  /** Lowest unmet level number (2..4), null when level 4 is already cleared. */
  firstGapLevel: LevelNumber | null;
  scores: LevelScores;
};
