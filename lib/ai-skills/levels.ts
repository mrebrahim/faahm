import type { LevelId, LevelNumber } from './types';

export type Level = {
  id: LevelId;
  number: LevelNumber;
  name_ar: string;
  tagline_ar: string;
  description_ar: string;
  emoji: string;
  colorClass: string;
  /** Skills the student demonstrates at this rung. */
  can_do_ar: string[];
  /** Next rung's call to action — used on the result page. */
  next_step_ar: string;
};

export const LEVELS: Level[] = [
  {
    id: 'awareness',
    number: 1,
    name_ar: 'الوعي',
    tagline_ar: 'سمعت عن الـ AI وعارف يعني إيه',
    description_ar:
      'في أول الطريق. عندك فكرة عن الـ AI وعمري شفته شغّال بس لسه ما استخدمتوش بانتظام. الخطوة الجاية: تتعلم تتكلم مع الـ AI بطريقة فعالة.',
    emoji: '🌱',
    colorClass: 'from-slate-500 to-slate-700',
    can_do_ar: [
      'تعرف الفرق بين الـ AI و الـ LLMs',
      'سمعت عن ChatGPT / Claude / Gemini',
      'تعرف الـ AI ممكن يعمل إيه نظرياً',
    ],
    next_step_ar: 'ابدأ بأساسيات البرومبت — هتفك معاه الـ AI بطريقة عملية.',
  },
  {
    id: 'prompting',
    number: 2,
    name_ar: 'الـ Prompting',
    tagline_ar: 'بتستخدم الـ AI كل يوم وعارف تطلّع منه نتيجة',
    description_ar:
      'بتشتغل بثقة مع الـ AI، بتظبّط الـ prompts، وعندك خبرة عملية مع أكتر من tool. الخطوة الجاية: تعرف تربط الأدوات في workflows متكاملة.',
    emoji: '✍️',
    colorClass: 'from-amber-500 to-orange-700',
    can_do_ar: [
      'بتكتب prompts بثقة',
      'بتظبّط الـ AI لما يطلّع نتيجة عامة',
      'بتنتج محتوى احترافي بـ AI tools',
    ],
    next_step_ar:
      'ابدأ بـ AI Video أو Vibe Coding عشان تتعلم تستفيد من الأدوات الأقوى.',
  },
  {
    id: 'tooling',
    number: 3,
    name_ar: 'الـ Tooling',
    tagline_ar: 'بتربط أكتر من أداة في workflow واحد',
    description_ar:
      'بتشتغل في الـ tier المتقدم — بتربط الأدوات، بتأتمت العمليات، وفاهم تكنيكات RAG و Fine-tuning. الخطوة الجاية: تبني agents وتطبيقات كاملة.',
    emoji: '🔗',
    colorClass: 'from-violet-500 to-purple-700',
    can_do_ar: [
      'بتربط أكتر من AI tool في workflow واحد',
      'بتأتمت عمليات كاملة بـ n8n / Make / Zapier',
      'فاهم RAG و Fine-tuning و Few-shot',
    ],
    next_step_ar: 'ابدأ بـ Vibe Coding أو n8n المتقدم عشان تبني حلول كاملة.',
  },
  {
    id: 'building',
    number: 4,
    name_ar: 'الـ Building',
    tagline_ar: 'بتبني تطبيقات وagents — مش بس بتستخدم',
    description_ar:
      'في قمة السلّم. بتبني تطبيقات AI شغّالة، تعرف frameworks زي LangChain و LlamaIndex، وممكن بتبيع حلولك. الخطوة الجاية: تعمق وتبني عملاء.',
    emoji: '🚀',
    colorClass: 'from-emerald-500 to-teal-700',
    can_do_ar: [
      'بتبني AI apps وagents شغّالة',
      'فاهم frameworks الـ AI الحديثة',
      'بتبيع حلول AI لعملاء',
    ],
    next_step_ar:
      'ادخل n8n المتقدم وVibe Coding بعمق — وفكّر تخصصك في قطاع معيّن.',
  },
];

const BY_ID = new Map(LEVELS.map((l) => [l.id, l]));
export function getLevel(id: LevelId): Level {
  return BY_ID.get(id) ?? LEVELS[0];
}
const BY_NUMBER = new Map(LEVELS.map((l) => [l.number, l]));
export function getLevelByNumber(n: number): Level {
  return BY_NUMBER.get(n as LevelNumber) ?? LEVELS[0];
}
