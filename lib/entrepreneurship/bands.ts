import type { BandId, Dimension } from './types';

export type Band = {
  id: BandId;
  name_ar: string;
  tagline_ar: string;
  description_ar: string;
  emoji: string;
  colorClass: string;
  range: [number, number];
  next_step_ar: string;
};

export const BANDS: Band[] = [
  {
    id: 'not_ready',
    name_ar: 'مش جاهز لسه — بس تقدر تبقى',
    tagline_ar: 'فيه فجوات كبيرة، لكنها كلها قابلة للسد',
    description_ar:
      'الجاهزية لشغل حر أو بيزنس بتتبني بالـ habits مش بالحظ. النتيجة دي مش حكم عليك، دي خريطة بتقولك إيه أهم حاجة تركز عليها الفترة الجاية.',
    emoji: '🌱',
    colorClass: 'from-slate-500 to-slate-700',
    range: [0, 39],
    next_step_ar:
      'ابدأ بسد الفجوة الكبرى الأول — بكره مش هتلاقي نفسك جاهز، بس بعد 3 شهور هتبقى شخص تاني.',
  },
  {
    id: 'almost_ready',
    name_ar: 'شبه جاهز — خطوة واحدة بتفصلك',
    tagline_ar: 'الأساس قوي، باقي حاجة محددة لازم تتبني',
    description_ar:
      'أنت أقرب لما تتخيل. عندك مهارة أساسية + استعداد للمخاطرة، باقي تركز على البُعد الأضعف اللي ظهر في تقريرك.',
    emoji: '🚀',
    colorClass: 'from-amber-500 to-orange-700',
    range: [40, 69],
    next_step_ar:
      'الفجوة الأضعف عندك واضحة. شد عليها 6-8 أسابيع وهتلاحظ الفرق فعلاً.',
  },
  {
    id: 'ready_to_leap',
    name_ar: 'جاهز للقفز — ابدأ دلوقتي',
    tagline_ar: 'الأرض مهيّأة — اللي ناقصك هو القرار',
    description_ar:
      'بروفايلك بيقول إنك جاهز للحركة. مفيش انتظار أحسن، الفلوس بتيجي للناس اللي بتبدأ، مش اللي بتجهّز للأبد.',
    emoji: '💼',
    colorClass: 'from-emerald-600 to-green-800',
    range: [70, 100],
    next_step_ar:
      'الخطوة الجاية مش "تتعلم أكتر"، الخطوة هي "تحط أول إعلان عن خدمتك" خلال 48 ساعة.',
  },
];

const BAND_BY_ID = new Map(BANDS.map((b) => [b.id, b]));
export function getBand(id: BandId): Band {
  return BAND_BY_ID.get(id) ?? BANDS[0];
}

/**
 * Per-dimension copy used in the result page's 'biggest gap' callout
 * and in the dimension breakdown bars.
 */
export const DIMENSION_META: Record<Dimension, { name_ar: string; gap_advice_ar: string }> = {
  risk_tolerance: {
    name_ar: 'تحمّل المخاطرة',
    gap_advice_ar:
      'ابدأ بحاجة صغيرة فيها risk محسوب — مشروع جانبي بسيط بدخل متغيّر — عشان تعتاد على عدم اليقين.',
  },
  self_direction: {
    name_ar: 'الانضباط الذاتي',
    gap_advice_ar:
      'الـ self-direction بتتبنى بـ habits. ابدأ بـ routine يومي قصير ثم وسّعه — كورس عزّز إنتاجيتك يساعدك تحط النظام.',
  },
  resourcefulness: {
    name_ar: 'الحيلة وحل المشاكل',
    gap_advice_ar:
      'استخدم الـ AI والـ YouTube بدل ما تستنى دورة رسمية. تعوّد تتعلم وتنفذ في نفس الأسبوع.',
  },
  sales_comm: {
    name_ar: 'البيع والتواصل',
    gap_advice_ar:
      'البيع مهارة بتتبنى بالممارسة. اعرض خدمتك على 10 ناس بصراحة الأسبوع ده — مش معاد، مش انتظار.',
  },
  skill_foundation: {
    name_ar: 'الأساس المهاري',
    gap_advice_ar:
      'تحتاج تبني مهارة قابلة للبيع. اختار تخصص (n8n / vibe-coding / ai-video) وادخل بعمق 4-6 أسابيع.',
  },
};
