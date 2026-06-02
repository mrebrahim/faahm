import type { RiasecCode, AssessmentResult } from './types';

export type Archetype = {
  id: string;
  /** Name shown to the student. */
  name_ar: string;
  /** One-line identity statement. */
  tagline_ar: string;
  /** Dominant RIASEC pair this archetype maps from. */
  codes: [RiasecCode, RiasecCode];
  /** Single emoji avatar for the result card. */
  emoji: string;
  /** Brand-ish color (Tailwind class). */
  colorClass: string;
  /** Static per-archetype report sections (PRD §13 Phase 1 fallback). */
  report: {
    you_in_a_nutshell: string;
    why_this_fits: string;
    careers: string[];
    first_step: string;
  };
};

export const ARCHETYPES: Archetype[] = [
  {
    id: 'systems_architect',
    name_ar: 'مهندس الأنظمة',
    tagline_ar: 'بتكره الفوضى وبتعشق إن كل حاجة تشتغل لوحدها بدقة',
    codes: ['I', 'C'],
    emoji: '🛠️',
    colorClass: 'from-sky-500 to-blue-700',
    report: {
      you_in_a_nutshell:
        'دماغك بتشتغل كأنها OS — بتفكك المشاكل، بتبني سيستمز، وبتفرح لما حاجة تبدأ تشتغل بدون تدخل منك. عندك صبر للتفاصيل اللي بتزهق غيرك.',
      why_this_fits:
        'اختياراتك بتقول إنك بتدوّر على إتقان وفهم عميق، مش بس تنفيذ سطحي. الـ I + C ده الـ DNA بتاع اللي بيبنوا الأتمتة والـ infrastructure اللي بيشغّل الشركات الجاية.',
      careers: [
        'Automation Specialist',
        'AI Operations Engineer',
        'No-Code Developer',
        'Workflow Consultant',
      ],
      first_step:
        'ابدأ تتعلم أداة أتمتة قوية زي n8n. خلال أسبوعين تقدر تبني أول workflow بيوفّر ساعات لشركة حقيقية.',
    },
  },
  {
    id: 'the_builder',
    name_ar: 'الصانع',
    tagline_ar: 'إيدك بتبني، ودماغك بتفكر بمنطق المبرمج',
    codes: ['R', 'I'],
    emoji: '⚙️',
    colorClass: 'from-amber-500 to-orange-600',
    report: {
      you_in_a_nutshell:
        'بتحب تشوف اللي بتفكر فيه قدامك متجسّد. التجربة عندك أهم من النظرية، وبتتعلم وأنت بتعمل — مش قبل ما تعمل.',
      why_this_fits:
        'الـ R + I بيتميل ناحية البناء العملي + الفهم العميق. أنت من اللي بيحب يفتح المشكلة، يفهمها من جوه، ويطلعلها حل بإيده — مش يكتفي بالتنظير.',
      careers: [
        'Indie Maker / App Builder',
        'AI Product Engineer',
        'Hardware-Software Hybrid',
        'Technical Founder',
      ],
      first_step:
        'ابني أول منتج بتاعك في أسبوع. Vibe Coding هيخلّيك تبني تطبيق كامل من غير ما تبقى مبرمج محترف.',
    },
  },
  {
    id: 'the_innovator',
    name_ar: 'المبتكر',
    tagline_ar: 'بتحب المساحات الفاضية اللي محدش فكّر فيها',
    codes: ['I', 'A'],
    emoji: '💡',
    colorClass: 'from-purple-500 to-fuchsia-600',
    report: {
      you_in_a_nutshell:
        'بتفكر بطريقة مختلفة، وبتلاقي وصلات بين أفكار محدش شافها مع بعض. الـ AI بالنسبالك مش tool — ده مساحة لعب تستكشف فيها.',
      why_this_fits:
        'الـ I + A نادرة — بتجمع بين التحليل والإبداع. أنت من اللي بيخترعوا حاجة جديدة، مش بس بينفّذوا اللي موجود.',
      careers: [
        'AI Product Designer',
        'Prompt Engineer / Researcher',
        'Creative Technologist',
        'R&D Specialist',
      ],
      first_step:
        'ابدأ بإتقان أساسيات البرومبت — ده الباب اللي يدخّلك تجرّب وتبني حاجات مفيش حد عملها قبل كده.',
    },
  },
  {
    id: 'the_creator',
    name_ar: 'صانع المحتوى',
    tagline_ar: 'قصصك بتوصل، وأفكارك بتلمس الناس',
    codes: ['A', 'E'],
    emoji: '🎬',
    colorClass: 'from-rose-500 to-pink-600',
    report: {
      you_in_a_nutshell:
        'عندك إحساس عالي بالـ storytelling + إحساس عمل/تسويق قوي. بتعرف الناس بتشوف إيه وبتعرف توصلهم رسالتك بطريقة مش تقليدية.',
      why_this_fits:
        'الـ A + E مزيج الـ Creator الحقيقي — مش بس فنان وبس، وبس مش بس صاحب بيزنس. أنت اللي ممكن يبني audience من الصفر ويحوّله لمشروع.',
      careers: [
        'AI Video Producer',
        'Personal Brand Creator',
        'Content Marketing Lead',
        'Short-Form Video Specialist',
      ],
      first_step:
        'ابدأ بكورس إنشاء الفيديوهات بالـ AI — هيخلّيك تنتج محتوى احترافي من غير كاميرا، فريق، أو ميزانية.',
    },
  },
  {
    id: 'the_connector',
    name_ar: 'الموصِّل',
    tagline_ar: 'بتحب الناس وبتعرف تنزّل عليهم الأفكار المعقدة بسهولة',
    codes: ['S', 'A'],
    emoji: '🤝',
    colorClass: 'from-emerald-500 to-teal-600',
    report: {
      you_in_a_nutshell:
        'الناس مركز اهتمامك. بتعرف توصل أي فكرة بطريقة بسيطة وحلوة، وعندك حاسة عالية إن مين محتاج إيه.',
      why_this_fits:
        'الـ S + A بيتميز إنه يقدر يبني community ويعلّم. مهارتك الكبرى إنك بتجمع بين فهم الناس والإبداع — ده اللي بيخلّي المعلّمين الأقوى.',
      careers: [
        'AI Educator / Course Creator',
        'Community Manager',
        'Customer Success Lead',
        'Coaching / Mentoring',
      ],
      first_step:
        'لو لسه مش متأكد من تخصصك، ابدأ بكورس اكتشاف الشغف عشان تحدد الـ vertical اللي تحب تساعد فيه الناس.',
    },
  },
  {
    id: 'the_strategist',
    name_ar: 'القائد',
    tagline_ar: 'بتشوف اللعبة من فوق، وبتعرف توزّع القطع صح',
    codes: ['E', 'I'],
    emoji: '🎯',
    colorClass: 'from-indigo-500 to-purple-700',
    report: {
      you_in_a_nutshell:
        'عقلك تحليلي بس عملي. بتشوف الـ big picture وبتاخد قرارات بسرعة، وعندك توق للنتائج الكبيرة.',
      why_this_fits:
        'الـ E + I = القائد الذكي. أنت اللي يبني الـ strategy بناءً على بيانات وفهم عميق، مش حدس وبس. ده ملف الـ founder بتاع شركة AI ناشئة.',
      careers: [
        'AI Business Consultant',
        'Operations / Automation Lead',
        'Tech Startup Founder',
        'Growth Strategist',
      ],
      first_step:
        'ابدأ بـ n8n عشان تتعلم تبني أنظمة بتقلّل تكاليف وتزوّد إيرادات — ده اللغة الأقوى لأي قائد بيزنس النهارده.',
    },
  },
];

const ARCHETYPE_BY_PAIR = new Map<string, Archetype>();
for (const a of ARCHETYPES) {
  ARCHETYPE_BY_PAIR.set(`${a.codes[0]}${a.codes[1]}`, a);
  ARCHETYPE_BY_PAIR.set(`${a.codes[1]}${a.codes[0]}`, a);
}

/**
 * Map the student's top-2 codes to an archetype. Falls back to the
 * Innovator (I+A) when the codes aren't a registered pair — generic
 * enough to feel right for any A-leaning student.
 */
export function matchArchetype(result: AssessmentResult): Archetype {
  const key = result.topCodes.slice(0, 2).join('');
  return ARCHETYPE_BY_PAIR.get(key) ?? ARCHETYPES[2];
}

export function archetypeById(id: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}
