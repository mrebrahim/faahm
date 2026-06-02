/**
 * EQ self-report model (Goleman 4-domain framework).
 * Every item is positively worded toward its domain — a higher Likert
 * answer always means more of that trait, which keeps scoring trivial
 * and removes the need for reverse-coded items.
 */
export type DomainId =
  | 'self_awareness'
  | 'self_regulation'
  | 'empathy'
  | 'social_skills';

export const DOMAIN_IDS: DomainId[] = [
  'self_awareness',
  'self_regulation',
  'empathy',
  'social_skills',
];

/** 0..4 — strongly disagree → strongly agree. */
export type LikertAnswer = 0 | 1 | 2 | 3 | 4;

export const LIKERT_LABELS = [
  'مش موافق خالص',
  'مش موافق',
  'متعادل',
  'موافق',
  'موافق جداً',
] as const;

export type EqQuestion = {
  id: string;
  domain: DomainId;
  text: string;
};

export type EqAnswer = {
  questionId: string;
  value: LikertAnswer;
};

export type DomainScore = { raw: number; max: number; pct: number };
export type DomainScores = Record<DomainId, DomainScore>;

export type BandId = 'growing' | 'balanced' | 'high';

export type EqResult = {
  overallScore: number;
  band: BandId;
  strongest: DomainId;
  weakest: DomainId;
  domains: DomainScores;
};
