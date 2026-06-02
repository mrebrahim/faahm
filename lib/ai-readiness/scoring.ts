import type {
  AIReadinessAnswer,
  AIReadinessResult,
  BandId,
  DimensionScores,
  LikertAnswer,
  WorkType,
} from './types';
import { AI_READINESS_QUESTIONS } from './questions';

/**
 * Score breakdown (totals to 100):
 *   Adoption  : 5 questions × 4 pts × 2.0 weight = 40 pts max
 *   Skill     : 5 questions × 4 pts × 2.0 weight = 40 pts max
 *   Exposure  : 4 questions × 4 pts inverted    × 1.25 = 20 pts max
 *
 * Exposure is INVERTED so a person with highly automatable work
 * loses 'readiness' points — high exposure = the AI takes the work.
 */
const ADOPTION_QUESTIONS = 5;
const SKILL_QUESTIONS = 5;
const EXPOSURE_QUESTIONS = 4;
const ADOPTION_MAX = ADOPTION_QUESTIONS * 4; // 20
const SKILL_MAX = SKILL_QUESTIONS * 4; // 20
const EXPOSURE_MAX = EXPOSURE_QUESTIONS * 4; // 16

export function tally(answers: AIReadinessAnswer[]): AIReadinessResult {
  const byId = new Map(AI_READINESS_QUESTIONS.map((q) => [q.id, q]));
  const raw: DimensionScores = { adoption: 0, skill: 0, exposure: 0 };
  let workType: WorkType = 'unclear';

  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (q.kind === 'scored') {
      const v = a.value as LikertAnswer;
      if (typeof v === 'number' && v >= 0 && v <= 4) {
        raw[q.dimension] += v;
      }
    } else if (q.kind === 'work_type') {
      const v = a.value as WorkType;
      if (
        v === 'office' ||
        v === 'tech' ||
        v === 'marketing' ||
        v === 'educator' ||
        v === 'unclear'
      ) {
        workType = v;
      }
    }
  }

  // Normalised dimension scores (each 0..100) for the result card.
  const dimensions: DimensionScores = {
    adoption: Math.round((raw.adoption / ADOPTION_MAX) * 100),
    skill: Math.round((raw.skill / SKILL_MAX) * 100),
    // Exposure is reported as-given (higher = more exposed) so the UI
    // can show 'kam exposed' rather than 'how immune' — easier to read.
    exposure: Math.round((raw.exposure / EXPOSURE_MAX) * 100),
  };

  const adoptionPts = (raw.adoption / ADOPTION_MAX) * 40;
  const skillPts = (raw.skill / SKILL_MAX) * 40;
  // Inverted exposure: 1 − (exposure / max) gives 0..1 with 'low exposure' = 1.
  const exposurePts = (1 - raw.exposure / EXPOSURE_MAX) * 20;
  const score = Math.round(adoptionPts + skillPts + exposurePts);

  const band: BandId = score < 40 ? 'high_exposure' : score < 70 ? 'safe' : 'ahead';

  return { score, band, workType, dimensions };
}
