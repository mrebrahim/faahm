/**
 * Related-courses picker. Two strategies:
 *
 *   1. Hand-picked map for the three AI flagship courses + their orbit
 *      (n8n, vibe-coding, ai-video, prompt-fundamentals, digital-teacher).
 *      Owner curated these so the cross-sell is intentional — n8n
 *      visitors are funneled to Vibe Coding + AI Video + ChatGPT,
 *      not random soft-skills courses.
 *
 *   2. For everything else, fall back to same-category courses
 *      sorted by rating_count DESC so the strongest social-proof
 *      sibling surfaces first.
 *
 * Both paths exclude the current course and cap at 4 results — enough
 * for a 2×2 (mobile) / 1×4 (desktop) rail.
 */
const HANDPICKED: Record<string, string[]> = {
  // Each list is the preferred order. The picker fills in any gaps
  // from the category fallback so a slug going stale never empties
  // the rail.
  n8n: ['vibe-coding', 'ai-video', 'prompt-fundamentals', 'digital-teacher'],
  'vibe-coding': ['n8n', 'ai-video', 'prompt-fundamentals', 'digital-teacher'],
  'ai-video': ['n8n', 'vibe-coding', 'prompt-fundamentals', 'digital-teacher'],
  'prompt-fundamentals': ['n8n', 'vibe-coding', 'ai-video', 'digital-teacher'],
  'digital-teacher': ['ai-video', 'prompt-fundamentals', 'n8n', 'vibe-coding'],
};

export type RelatedCandidate = {
  id: string;
  slug: string;
  title_ar: string;
  thumbnail_url: string | null;
  total_lessons: number;
  total_duration_sec: number;
  rating_avg: string | number | null;
  rating_count: number | null;
  category_id: string | null;
};

export function pickRelated(
  current: RelatedCandidate,
  pool: RelatedCandidate[],
  limit = 4
): RelatedCandidate[] {
  const others = pool.filter((c) => c.id !== current.id);
  const bySlug = new Map(others.map((c) => [c.slug, c]));

  const picked: RelatedCandidate[] = [];
  const seen = new Set<string>();
  const add = (c: RelatedCandidate | undefined) => {
    if (!c || seen.has(c.slug)) return;
    seen.add(c.slug);
    picked.push(c);
  };

  // Pass 1 — hand-picked order for this slug, if any.
  for (const slug of HANDPICKED[current.slug] ?? []) {
    if (picked.length >= limit) break;
    add(bySlug.get(slug));
  }

  // Pass 2 — same category, sorted by rating_count desc (proxy for
  // 'most learners liked it').
  if (picked.length < limit && current.category_id) {
    const sameCat = others
      .filter((c) => c.category_id === current.category_id)
      .sort(
        (a, b) =>
          (Number(b.rating_count) || 0) - (Number(a.rating_count) || 0)
      );
    for (const c of sameCat) {
      if (picked.length >= limit) break;
      add(c);
    }
  }

  // Pass 3 — global best (rating_count desc) so the rail is never
  // shorter than `limit` while there are courses left in the catalog.
  if (picked.length < limit) {
    const rest = others
      .slice()
      .sort(
        (a, b) =>
          (Number(b.rating_count) || 0) - (Number(a.rating_count) || 0)
      );
    for (const c of rest) {
      if (picked.length >= limit) break;
      add(c);
    }
  }

  return picked;
}
