import type { ThemeId } from './types';

export type Theme = {
  id: ThemeId;
  name_ar: string;
  tagline_ar: string;
  emoji: string;
  /** Brand-aligned gradient class — keeps the result card warm. */
  colorClass: string;
  description_ar: string;
};

export const THEMES: Theme[] = [
  {
    id: 'building',
    name_ar: 'البناء والصنع',
    tagline_ar: 'بتعشق إن تشوف اللي في دماغك بيتجسد قدامك',
    emoji: '🔨',
    colorClass: 'from-amber-500 to-orange-700',
    description_ar:
      'بتلاقي راحة في إنك تحوّل فكرة لمنتج/نظام/أداة. التجريب والـ iteration بيشحنك. الـ "اللي بإيدي" أوضح من النظري.',
  },
  {
    id: 'creating',
    name_ar: 'التعبير والإبداع',
    tagline_ar: 'بتكتب/بتصمم/بتصوّر حاجة من غير ما حد يطلب',
    emoji: '🎨',
    colorClass: 'from-pink-500 to-rose-700',
    description_ar:
      'الفن بالنسبالك مش هواية، ده طريقة بتفهم بيها العالم. ساعات تحس إن لو ما عبّرتش، صدرك هينضرب من جوه.',
  },
  {
    id: 'execution',
    name_ar: 'الإنجاز والتنفيذ',
    tagline_ar: 'بتعشق اللحظة اللي بتعمل فيها check على المهمة',
    emoji: '✅',
    colorClass: 'from-emerald-500 to-teal-700',
    description_ar:
      'الـ structure بيريحك، والفوضى بتزعّجك. الحاجة اللي ساكنة في قائمة المهام بدون تنفيذ بتقتلك من جوه.',
  },
  {
    id: 'mastery',
    name_ar: 'الإتقان والعمق',
    tagline_ar: 'مش بتحب تعرف، بتحب تفهم',
    emoji: '🎯',
    colorClass: 'from-sky-500 to-indigo-700',
    description_ar:
      'بتدوّر على "الليه" مش بس "الإيه". بتمشي 10 خطوات في موضوع وغيرك بياخد منه خطوة واحدة. الإتقان عندك قيمة، مش وسيلة.',
  },
  {
    id: 'impact',
    name_ar: 'التأثير والمعنى',
    tagline_ar: 'بتحب تترك أثر، مش بس تكسب فلوس',
    emoji: '💫',
    colorClass: 'from-violet-500 to-purple-700',
    description_ar:
      'الحاجة اللي بتعملها لازم يكون فيها معنى يلامس حياة حد. لو شغلك مش بيغيّر حاجة، بتفقد الحماس بسرعة.',
  },
];

const BY_ID = new Map(THEMES.map((t) => [t.id, t]));
export function getTheme(id: ThemeId): Theme {
  return BY_ID.get(id) ?? THEMES[0];
}
