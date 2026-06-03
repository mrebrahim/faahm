import type { BandId, Dimension } from './types';

export type Band = {
  id: BandId;
  name_ar: string;
  tagline_ar: string;
  description_ar: string;
  emoji: string;
  colorClass: string;
  range: [number, number];
  /** PRD §4 — concrete catch-up plan intro for each band. */
  catch_up_plan_intro: string;
};

export const BANDS: Band[] = [
  {
    id: 'danger',
    name_ar: 'في منطقة الخطر',
    tagline_ar: 'شغلك مكشوف، والوقت لسه في صفّك لو تحرّكت دلوقتي',
    description_ar:
      'شغلك دلوقتي قابل للأتمتة لدرجة كبيرة، وانت لسه مش بتستغل الـ AI ولا بتتحصّن بعلاقات أو خبرة صعب تتبدّل.',
    emoji: '🚨',
    colorClass: 'from-rose-500 to-red-700',
    range: [0, 35],
    catch_up_plan_intro:
      'متبدأش بالأدوات — ابدأ بفهم إزاي شغلك ممكن يتغيّر، وحوّل نفسك من "منفّذ مهام" لـ "صاحب نتيجة":',
  },
  {
    id: 'transitioning',
    name_ar: 'في وضع التحوّل',
    tagline_ar: 'مش في خطر مباشر — بس مش مستغل وضعك لسه',
    description_ar:
      'انت مش في خطر مباشر، بس مش مستغل وضعك. فيه أجزاء من شغلك معرّضة، وفيه أجزاء محصّنة — والفرق هيتحدد بسرعة تحرّكك.',
    emoji: '🟠',
    colorClass: 'from-amber-500 to-orange-600',
    range: [36, 60],
    catch_up_plan_intro:
      'ابدأ تدخّل AI في مهامك المتكررة، واتعلّم تبني workflows تشيل عنك الشغل الممل:',
  },
  {
    id: 'strong',
    name_ar: 'في وضع قوي',
    tagline_ar: 'الخطر عليك قليل — لسه فيه سقف أعلى',
    description_ar:
      'انت بتستخدم AI فعلاً، وعندك تحصين بشري كويس، وبتتكيّف بسرعة. الخطر عليك قليل — بس فيه سقف ممكن توصله أعلى.',
    emoji: '🟢',
    colorClass: 'from-emerald-500 to-teal-700',
    range: [61, 80],
    catch_up_plan_intro:
      'انقل من "بتستخدم AI" لـ "بتبني بـ AI" — خلّي الـ AI يعملك أنظمة كاملة، مش مهام منفصلة:',
  },
  {
    id: 'leading',
    name_ar: 'انت اللي هتاخد شغل غيرك',
    tagline_ar: 'مش في خطر — انت الفرصة',
    description_ar:
      'انت مش في خطر — انت الفرصة. بتستغل AI، صاحب علاقات ونتايج، وبتتعلّم أسرع من مجالك كله.',
    emoji: '🚀',
    colorClass: 'from-violet-600 to-purple-800',
    range: [81, 100],
    catch_up_plan_intro:
      'القيمة الحقيقية بقت في إنك تعلّم وتقود غيرك. ابني الأنظمة اللي الكل هيستخدمها:',
  },
];

const BAND_BY_ID = new Map(BANDS.map((b) => [b.id, b]));
export function getBand(id: BandId): Band {
  return BAND_BY_ID.get(id) ?? BANDS[1];
}

/** Per-dimension copy used in the result page breakdown. */
export const DIMENSION_META: Record<
  Dimension,
  { name_ar: string; short_ar: string; growth_advice_ar: string }
> = {
  task_composition: {
    name_ar: 'طبيعة المهام',
    short_ar: 'متكررة ولا حكم؟',
    growth_advice_ar:
      'لو شغلك متكرر، دور على الجزء اللي بيحتاج قرار وركّز عليه. ابني نفسك في الـ "إيه" مش الـ "إزاي".',
  },
  digital_exposure: {
    name_ar: 'التعرّض الرقمي',
    short_ar: 'شاشة ولا تواصل بشري؟',
    growth_advice_ar:
      'لو شغلك كله رقمي، الـ AI هو منافسك المباشر. ابني component إنساني (تواصل، علاقات، قيادة).',
  },
  ai_leverage: {
    name_ar: 'استخدام الـ AI الفعلي',
    short_ar: 'بتستخدمه ولا بتتفرج؟',
    growth_advice_ar:
      'الفرق بين "بعرف AI" و"بستخدم AI" هو سنتين خبرة. ابدأ تدخّله في مهمة واحدة كل أسبوع.',
  },
  economic_moat: {
    name_ar: 'الموقع الاقتصادي',
    short_ar: 'سهل تتبدّل؟',
    growth_advice_ar:
      'القيمة الحقيقية في العلاقات والثقة. ابني علاقات مباشرة مع عملاء، مش مع وسطاء.',
  },
  adaptation: {
    name_ar: 'سرعة التكيّف',
    short_ar: 'بتتعلّم بسرعة؟',
    growth_advice_ar:
      'سرعة التعلّم بقت أهم من اللي تعرفه. خلّي عندك "أداة جديدة في الأسبوع" routine.',
  },
  mindset: {
    name_ar: 'العقلية',
    short_ar: 'تهديد ولا فرصة؟',
    growth_advice_ar:
      'اللي بيشوف AI تهديد بيخسر مرتين: من القلق، ومن إنه مش بيستخدمه. اعتبره amplifier ليك.',
  },
};
