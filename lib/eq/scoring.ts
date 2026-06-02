import type {
  BandId,
  DomainId,
  DomainScore,
  DomainScores,
  EqAnswer,
  EqResult,
} from './types';
import { DOMAIN_IDS } from './types';
import { EQ_QUESTIONS } from './questions';

/**
 * Sum Likert values per domain → normalised %. Overall is a flat
 * average of the four domain percentages (every domain weighted
 * equally; we don't have evidence to weight one over the others).
 *
 * Bands frame the result as growth potential, never as a deficit
 * — per the PRD's soft / lead-magnet positioning.
 */
export function tally(answers: EqAnswer[]): EqResult {
  const byId = new Map(EQ_QUESTIONS.map((q) => [q.id, q]));
  const totals: Record<DomainId, { raw: number; max: number }> = {
    self_awareness: { raw: 0, max: 0 },
    self_regulation: { raw: 0, max: 0 },
    empathy: { raw: 0, max: 0 },
    social_skills: { raw: 0, max: 0 },
  };
  for (const q of EQ_QUESTIONS) totals[q.domain].max += 4;

  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (a.value < 0 || a.value > 4) continue;
    totals[q.domain].raw += a.value;
  }

  const domains = {} as DomainScores;
  for (const d of DOMAIN_IDS) {
    const { raw, max } = totals[d];
    domains[d] = {
      raw,
      max,
      pct: max > 0 ? Math.round((raw / max) * 100) : 0,
    } satisfies DomainScore;
  }

  const overallScore = Math.round(
    DOMAIN_IDS.reduce((acc, d) => acc + domains[d].pct, 0) / DOMAIN_IDS.length
  );

  const band: BandId =
    overallScore < 40 ? 'growing' : overallScore < 70 ? 'balanced' : 'high';

  // Stable strongest / weakest — ties broken by DOMAIN_IDS order.
  const strongest = DOMAIN_IDS.reduce(
    (best, d) => (domains[d].pct > domains[best].pct ? d : best),
    DOMAIN_IDS[0]
  );
  const weakest = DOMAIN_IDS.reduce(
    (low, d) => (domains[d].pct < domains[low].pct ? d : low),
    DOMAIN_IDS[0]
  );

  return { overallScore, band, strongest, weakest, domains };
}
