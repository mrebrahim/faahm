import type {
  SelfDiscoveryAnswer,
  SelfDiscoveryResult,
  ThemeId,
  ThemeScores,
} from './types';
import { SELF_DISCOVERY_QUESTIONS } from './questions';
import { THEME_IDS } from './types';

/**
 * Sum theme weights across the tappable answers. The top 3 themes (or
 * fewer if some tied at zero) become the 'passion profile'. Reflection
 * answers are passed through untouched for the Phase 2 AI report.
 */
export function tally(answers: SelfDiscoveryAnswer[]): SelfDiscoveryResult {
  const byId = new Map(SELF_DISCOVERY_QUESTIONS.map((q) => [q.id, q]));
  const scores: ThemeScores = {
    building: 0,
    creating: 0,
    execution: 0,
    mastery: 0,
    impact: 0,
  };
  const reflections: Record<string, string> = {};

  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (q.kind === 'choice' && 'optionIndex' in a) {
      const opt = q.options[a.optionIndex];
      if (!opt) continue;
      for (const [theme, weight] of Object.entries(opt.themes)) {
        scores[theme as ThemeId] += weight || 0;
      }
    } else if (q.kind === 'reflection' && 'text' in a) {
      const trimmed = a.text.trim();
      if (trimmed) reflections[q.id] = trimmed.slice(0, 600);
    }
  }

  const ranked = (THEME_IDS as ThemeId[])
    .slice()
    .sort((a, b) => scores[b] - scores[a]);
  // Top is up to 3 themes that actually scored something.
  const top = ranked.filter((t) => scores[t] > 0).slice(0, 3);

  return { scores, ranked, top, reflections };
}

/**
 * 'Weak signal' marker — the top theme barely beats the next one.
 * Used to nudge the report copy toward the honesty branch.
 */
export function isWeakProfile(result: SelfDiscoveryResult): boolean {
  if (result.top.length === 0) return true;
  const first = result.scores[result.top[0]];
  const second = result.top[1] ? result.scores[result.top[1]] : 0;
  if (first === 0) return true;
  return first - second < 2;
}
