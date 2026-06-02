import type { AIReadinessQuestion } from './types';

/**
 * 15 questions = 5 Adoption + 5 Skill + 4 Exposure + 1 work_type
 * (signal-only, drives course matching not the score).
 *
 * Answer values 0..4 for scored questions. For Exposure, a higher
 * value means the work is MORE automatable — the scoring module
 * inverts this so 'low exposure → high readiness'.
 *
 * Interleaved across dimensions in the order shown to mute response bias.
 */
export const AI_READINESS_QUESTIONS: AIReadinessQuestion[] = [
  {
    id: 'r1',
    kind: 'scored',
    dimension: 'adoption',
    prompt: 'بتستخدم ChatGPT أو Claude أو Gemini كل قد إيه في شغلك؟',
    options: [
      { value: 4, label: 'يومياً، ومستحيل أشتغل بدونه' },
      { value: 3, label: '2-3 مرات في الأسبوع' },
      { value: 2, label: 'مرة كل أسبوعين' },
      { value: 1, label: 'مرة كل شهر أو أقل' },
      { value: 0, label: 'مش بستخدمه خالص' },
    ],
  },
  {
    id: 'r2',
    kind: 'scored',
    dimension: 'exposure',
    prompt: 'شغلك اليومي قد إيه بيعتمد على مهام متكررة ممكن أداة تعملها بدالك؟',
    options: [
      { value: 4, label: 'معظم شغلي مهام متكررة' },
      { value: 3, label: 'نص لنص' },
      { value: 2, label: 'شوية مهام' },
      { value: 1, label: 'قليل جداً' },
      { value: 0, label: 'شغلي إبداعي / استراتيجي 100%' },
    ],
  },
  {
    id: 'r3',
    kind: 'scored',
    dimension: 'skill',
    prompt: 'تقدر تكتب prompt يطلّعلك اللي عايزه بالظبط من ChatGPT؟',
    options: [
      { value: 4, label: 'أكيد، عندي قواعد بشتغل بيها' },
      { value: 3, label: 'في الغالب يطلّعلي اللي عايزه' },
      { value: 2, label: 'أحياناً' },
      { value: 1, label: 'بصعوبة' },
      { value: 0, label: 'معرفش أكتب prompts صح' },
    ],
  },
  {
    id: 'r4',
    kind: 'scored',
    dimension: 'adoption',
    prompt: 'بتستخدم AI tools زي Midjourney / Suno / Runway / مساعد الكود في شغلك؟',
    options: [
      { value: 4, label: 'أيوة، أكتر من tool وكل واحد لمهمة' },
      { value: 3, label: 'أيوة، tool واحد على الأقل بشكل ثابت' },
      { value: 2, label: 'بجرّب من وقت للتاني' },
      { value: 1, label: 'سمعت عنهم بس مجربتش' },
      { value: 0, label: 'مش عارف أصلاً' },
    ],
  },
  {
    id: 'r5',
    kind: 'scored',
    dimension: 'skill',
    prompt: 'عارف الفرق بين Zero-shot, Few-shot, و Chain-of-Thought prompts؟',
    options: [
      { value: 4, label: 'عارفهم وبستخدمهم' },
      { value: 3, label: 'عارف نظرياً' },
      { value: 2, label: 'سمعت عنهم' },
      { value: 1, label: 'شوية' },
      { value: 0, label: 'مش عارف خالص' },
    ],
  },
  {
    id: 'r6',
    kind: 'scored',
    dimension: 'exposure',
    prompt: 'قد إيه شغلك ممكن يتشرح في خطوات واضحة محفوظة؟',
    options: [
      { value: 4, label: 'كله مكتوب وواضح' },
      { value: 3, label: 'معظمه' },
      { value: 2, label: 'نص نص' },
      { value: 1, label: 'شوية' },
      { value: 0, label: 'معظمه قرارات وحكم شخصي' },
    ],
  },
  {
    id: 'r7',
    kind: 'scored',
    dimension: 'adoption',
    prompt: 'عملت قبل كده automation (workflow) بيشتغل لوحده؟ (n8n / Zapier / Make)',
    options: [
      { value: 4, label: 'أيوة، ومسيطر على البناء' },
      { value: 3, label: 'أيوة، حاجات بسيطة' },
      { value: 2, label: 'حاولت بس مكملتش' },
      { value: 1, label: 'أفكر أتعلم' },
      { value: 0, label: 'مش فاهم الكلام ده أصلاً' },
    ],
  },
  {
    id: 'r8',
    kind: 'scored',
    dimension: 'skill',
    prompt: 'لو AI رد عليك بإجابة غلط، تقدر تظبّط السؤال بحيث يطلع صح؟',
    options: [
      { value: 4, label: 'بسرعة وبدون مشاكل' },
      { value: 3, label: 'في معظم الحالات' },
      { value: 2, label: 'أحياناً' },
      { value: 1, label: 'بصعوبة' },
      { value: 0, label: 'لأ، بسيب الموضوع' },
    ],
  },
  {
    id: 'r9',
    kind: 'scored',
    dimension: 'exposure',
    prompt: 'تفتكر AI ممكن يعمل 50% من شغلك خلال 3 سنين؟',
    options: [
      { value: 4, label: 'أيوة، أكتر من النص' },
      { value: 3, label: 'ممكن النص' },
      { value: 2, label: 'شوية' },
      { value: 1, label: 'مش كتير' },
      { value: 0, label: 'مستحيل، شغلي محتاج بشر' },
    ],
  },
  {
    id: 'r10',
    kind: 'scored',
    dimension: 'adoption',
    prompt: 'ساعات بتلاقي نفسك بتدوّر على prompt جديد أو طريقة أحسن تستخدم بيها AI؟',
    options: [
      { value: 4, label: 'دايماً، ده جزء من شغلي' },
      { value: 3, label: 'من وقت للتاني' },
      { value: 2, label: 'مرة كل فترة' },
      { value: 1, label: 'نادراً' },
      { value: 0, label: 'مش بفكر في ده' },
    ],
  },
  {
    id: 'r11',
    kind: 'scored',
    dimension: 'skill',
    prompt: 'تقدر تجمع كذا AI tool في workflow واحد؟ (ChatGPT + Midjourney + Make مثلاً)',
    options: [
      { value: 4, label: 'أيوة، عملته قبل كده' },
      { value: 3, label: 'أفهم الفكرة وممكن أعملها' },
      { value: 2, label: 'فكرة بعيدة' },
      { value: 1, label: 'لأ' },
      { value: 0, label: 'مش فاهم' },
    ],
  },
  {
    id: 'r12',
    kind: 'scored',
    dimension: 'exposure',
    prompt: 'ساعات بتسأل نفسك "لو حد عمل أداة بتعمل ده، أنا هخدم بإيه؟"',
    options: [
      { value: 4, label: 'أيوة، كتير' },
      { value: 3, label: 'من وقت للتاني' },
      { value: 2, label: 'أحياناً' },
      { value: 1, label: 'نادراً' },
      { value: 0, label: 'أبداً، شغلي محصّن' },
    ],
  },
  {
    id: 'r13',
    kind: 'scored',
    dimension: 'adoption',
    prompt: 'عندك حساب مدفوع (Plus / Pro / Team) في أي AI tool؟',
    options: [
      { value: 4, label: 'أكتر من حساب' },
      { value: 3, label: 'حساب واحد' },
      { value: 2, label: 'فكّرت أعمل، بس لسه' },
      { value: 1, label: 'مش محتاج' },
      { value: 0, label: 'مش عارف الفرق' },
    ],
  },
  {
    id: 'r14',
    kind: 'scored',
    dimension: 'skill',
    prompt: 'تقدر تقيّم لو الـ output من AI صح ولا غلط؟',
    options: [
      { value: 4, label: 'أيوة، عندي معايير واضحة' },
      { value: 3, label: 'في معظم الأوقات' },
      { value: 2, label: 'أحياناً' },
      { value: 1, label: 'بصعوبة' },
      { value: 0, label: 'بسلّم بأي حاجة بيقولها' },
    ],
  },
  {
    id: 'r15',
    kind: 'work_type',
    prompt: 'شغلك الحالي أو اللي بتدوّر عليه أقرب لإيه؟',
    options: [
      { value: 'office', label: 'مكتبي / إداري / مهام متكررة' },
      { value: 'tech', label: 'تقني / تطوير / بناء أدوات' },
      { value: 'marketing', label: 'تسويق / محتوى / فيديوهات' },
      { value: 'educator', label: 'تدريس / تدريب / تعليم' },
      { value: 'unclear', label: 'لسه مش متأكد' },
    ],
  },
];
