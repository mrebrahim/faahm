import type { BlockerId } from './types';

export type Blocker = {
  id: BlockerId;
  name_ar: string;
  tagline_ar: string;
  description_ar: string;
  emoji: string;
  colorClass: string;
  /** 3 concrete habit prompts the student can use this week. */
  tactics_ar: string[];
  /** Single 10-min action for the result card per PRD §12 — shareable hook. */
  first_10_min_ar: string;
};

export const BLOCKERS: Blocker[] = [
  {
    id: 'overwhelm',
    name_ar: 'الـ Overwhelm',
    tagline_ar: 'المهمة كبيرة جداً ودماغك بترفض تبدأ',
    description_ar:
      'الإحساس مش إنك كسلان — دماغك بتتعامل مع المهمة الكبيرة كأنها تهديد فبتأجلها. الحل مش "ابدأ"، الحل تقسّمها لخطوات صغيرة قوي.',
    emoji: '🌊',
    colorClass: 'from-sky-500 to-blue-700',
    tactics_ar: [
      'قسّم المهمة الكبيرة لقطع لا تتعدى دقيقتين',
      'افتح ملف فاضي واكتب أول 3 خطوات بس',
      'استخدم AI يقسّملك المهمة بدلاً منك',
    ],
    first_10_min_ar:
      'اكتب على ورقة "أول خطوة هاعملها هي:" وخلاص. مش هتنفّذها دلوقتي، بس هتعرف منين تبدأ بكرة.',
  },
  {
    id: 'perfectionism',
    name_ar: 'الـ Perfectionism',
    tagline_ar: 'خايف تبدأ لأنك خايف ما يطلعش مظبوط',
    description_ar:
      'بتأجّل لأنك مش حاطط "good enough" كخيار. النتيجة: مفيش حاجة بتخلص. الـ MVP أقوى من الـ Masterpiece اللي مش بيطلع.',
    emoji: '🎯',
    colorClass: 'from-rose-500 to-red-700',
    tactics_ar: [
      'حدّد سلفاً 70% كحد كافي للنشر/التسليم',
      'شارك draft قبل ما يبقى كامل',
      'فكر "إصدار 1" بدل "النسخة النهائية"',
    ],
    first_10_min_ar:
      'خد آخر مهمة أجّلتها، اعمل منها draft "وحش متعمد" في 10 دقايق وشاركه مع حد.',
  },
  {
    id: 'distraction',
    name_ar: 'الـ Distraction',
    tagline_ar: 'بتشتغل على المهمة بس عقلك في 10 تابات',
    description_ar:
      'مش مشكلة في رغبتك — مشكلة في بيئتك. كل إشعار وكل تبويب جديد بيقتطع من تركيزك. التركيز عضلة، والبيئة هي وزنها.',
    emoji: '📱',
    colorClass: 'from-amber-500 to-orange-700',
    tactics_ar: [
      'حط موبايلك في غرفة تانية وأنت بتشتغل',
      'بلوك السوشيال في ساعات الـ deep work',
      'استخدم Pomodoro (45 دقيقة تركيز + 15 راحة)',
    ],
    first_10_min_ar:
      'حط موبايلك على Silent وبعّده عن إيدك لـ 25 دقيقة. ابدأ تشتغل خلالهم. مش هتموت.',
  },
  {
    id: 'low_clarity',
    name_ar: 'وضوح الهدف',
    tagline_ar: 'بتأجّل لأنك مش متأكد ليه بتعمل ده أصلاً',
    description_ar:
      'مش كسل، ومش perfectionism. الـ "ليه" نفسه مش واضح. المهام بتبقى ثقيلة لما الهدف منها مش مقنع لجواك.',
    emoji: '🧭',
    colorClass: 'from-emerald-500 to-teal-700',
    tactics_ar: [
      'اكتب لكل مهمة جملة واحدة: "بعمل ده عشان…"',
      'لو ما لقيتش إجابة، فكر تشيل المهمة دي',
      'وضّح هدفك الأكبر الأول، التفاصيل هتترتب',
    ],
    first_10_min_ar:
      'اكتب على ورقة أول 3 أسطر بتجاوب على سؤال: "هل اللي بشتغل عليه ده فعلاً يستاهل؟" بصراحة.',
  },
];

const BY_ID = new Map(BLOCKERS.map((b) => [b.id, b]));
export function getBlocker(id: BlockerId): Blocker {
  return BY_ID.get(id) ?? BLOCKERS[0];
}
