import { archetypeById } from '@/lib/career/archetypes';
import { getType } from '@/lib/personality/personality-types';
import { getBand } from '@/lib/ai-readiness/bands';
import { getTheme as getSelfDiscoveryTheme } from '@/lib/self-discovery/themes';
import { getLevel as getSkillLevel } from '@/lib/ai-skills/levels';
import { getBlocker } from '@/lib/productivity/blockers';
import { getBand as getEntrepreneurshipBand } from '@/lib/entrepreneurship/bands';
import { getBand as getEqBand, getDomain as getEqDomain } from '@/lib/eq/domains';

/**
 * Every quiz on the platform stores its outcome as a compact `result_code`
 * on the lead row — 'INTJ', 'ready', 'band-3|service', 'theme1+theme2', …
 * Those codes are meaningless to a human reading the admin table or a CSV
 * export, so both surfaces run them back through the per-quiz lookup
 * tables to recover the Arabic label.
 *
 * This module is the single source of that mapping: /admin/leads renders
 * from it and /api/admin/leads/export writes the same string into the CSV,
 * so the sheet a marketer opens says exactly what the dashboard said.
 */

export type LeadTestType =
  | 'career'
  | 'personality'
  | 'ai_readiness'
  | 'self_discovery'
  | 'ai_skills'
  | 'productivity'
  | 'entrepreneurship'
  | 'eq'
  | 'newsletter';

export const TEST_TYPE_LABELS: Record<LeadTestType, string> = {
  career: 'التيست المهني',
  personality: 'اختبار الشخصية',
  ai_readiness: 'جاهزية الـ AI',
  self_discovery: 'اكتشاف الذات',
  ai_skills: 'مستوى الـ AI',
  productivity: 'الإنتاجية',
  entrepreneurship: 'الشغل الحر',
  eq: 'الذكاء العاطفي',
  newsletter: 'النشرة البريدية',
};

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  homepage_zaka_live: 'الصفحة الرئيسية — ذكاء لايف',
};

export type LeadResult = {
  /** Arabic label, or '—' when the quiz stored no code. */
  label: string;
  /** Decorative emoji for the dashboard; omitted from CSV output. */
  emoji: string | null;
};

/**
 * Decode a lead's `result_code` into a readable Arabic label. Each lookup
 * falls back to a default entry rather than throwing, so a stale or
 * hand-edited code degrades to a neighbouring label instead of blowing up
 * a 5,000-row export.
 */
export function describeLeadResult(
  testType: string | null | undefined,
  resultCode: string | null | undefined
): LeadResult {
  const none: LeadResult = { label: '—', emoji: null };
  if (!testType || !resultCode) return none;

  switch (testType) {
    case 'career': {
      const arc = archetypeById(resultCode);
      return arc
        ? { label: arc.name_ar, emoji: arc.emoji }
        : { label: resultCode, emoji: null };
    }

    case 'personality': {
      const t = getType(resultCode);
      return t
        ? { label: `${t.name_ar} · ${resultCode}`, emoji: t.emoji }
        : { label: resultCode, emoji: null };
    }

    case 'ai_readiness': {
      const band = getBand(resultCode as any);
      return { label: band.name_ar.split('—')[0].trim(), emoji: band.emoji };
    }

    case 'self_discovery': {
      // result_code carries the top themes as 'theme1+theme2+theme3'.
      const parts = resultCode.split('+').filter(Boolean);
      if (!parts.length) return none;
      const top = parts.map((p) => getSelfDiscoveryTheme(p as any));
      return {
        label: top.map((t) => t.name_ar).join(' + '),
        emoji: top[0].emoji,
      };
    }

    case 'ai_skills': {
      const lv = getSkillLevel(resultCode as any);
      return { label: `Level ${lv.number} · ${lv.name_ar}`, emoji: lv.emoji };
    }

    case 'productivity': {
      const b = getBlocker(resultCode as any);
      return { label: b.name_ar, emoji: b.emoji };
    }

    case 'entrepreneurship': {
      // result_code = '<bandId>|<workType>'
      const [bandId, wt] = resultCode.split('|');
      const band = getEntrepreneurshipBand(bandId as any);
      const wtLabel =
        wt === 'service'
          ? 'خدمات'
          : wt === 'product'
            ? 'منتج'
            : wt === 'content'
              ? 'محتوى'
              : '—';
      return {
        label: `${band.name_ar.split('—')[0].trim()} · ${wtLabel}`,
        emoji: band.emoji,
      };
    }

    case 'eq': {
      // result_code = '<bandId>|<strongest>|<weakest>'
      const [bandId, strongest] = resultCode.split('|');
      const band = getEqBand(bandId as any);
      const sd = getEqDomain(strongest as any);
      return {
        label: `${band.name_ar.split('—')[0].trim()} · قوة: ${sd.short_ar}`,
        emoji: band.emoji,
      };
    }

    default:
      return none;
  }
}

/**
 * Which funnel the lead came through. Newsletter signups carry a
 * `detail_source` (which homepage widget captured them); quiz leads are
 * identified by the quiz itself.
 */
export function describeLeadSource(
  testType: string | null | undefined,
  detailSource: string | null | undefined
): string {
  if (testType === 'newsletter') {
    return (detailSource && LEAD_SOURCE_LABELS[detailSource]) || detailSource || '—';
  }
  return TEST_TYPE_LABELS[testType as LeadTestType] ?? testType ?? '—';
}
