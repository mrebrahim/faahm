/**
 * Self-Discovery model — soft, theme-based; not a single typed result.
 * Five themes map onto the live faahm catalog, with discover-your-passion
 * always primary because the entire test funnels into it.
 */
export type ThemeId =
  | 'building'
  | 'creating'
  | 'execution'
  | 'mastery'
  | 'impact';

export const THEME_IDS: ThemeId[] = [
  'building',
  'creating',
  'execution',
  'mastery',
  'impact',
];

export type ThemeScores = Record<ThemeId, number>;

export type SelfDiscoveryOption = {
  label: string;
  /** Weighted contribution to one or more themes. */
  themes: Partial<Record<ThemeId, number>>;
};

export type SelfDiscoveryQuestion =
  | {
      id: string;
      kind: 'choice';
      prompt: string;
      options: SelfDiscoveryOption[];
    }
  | {
      id: string;
      kind: 'reflection';
      prompt: string;
      placeholder: string;
      /** Optional — the user can skip and we just don't store text. */
    };

export type SelfDiscoveryAnswer =
  | { questionId: string; optionIndex: number }
  | { questionId: string; text: string };

export type SelfDiscoveryResult = {
  scores: ThemeScores;
  /** Themes ranked by score, descending. */
  ranked: ThemeId[];
  /** Top 2–3 themes shown to the user as the 'passion profile'. */
  top: ThemeId[];
  /** Free-text reflections keyed by question id (only present when answered). */
  reflections: Record<string, string>;
};
