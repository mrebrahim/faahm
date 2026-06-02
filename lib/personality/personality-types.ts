/**
 * The 16 types — original Arabic copy per PRD §5. No MBTI / 16personalities
 * nicknames or descriptions. Each type carries the static report sections
 * we render today and that stay as the fallback once Phase 2 wires the
 * OpenAI-generated version.
 */

export type CourseGroup = 'analysts' | 'diplomats' | 'sentinels' | 'explorers';

export type PersonalityType = {
  code: string; // 'INTJ' etc.
  name_ar: string;
  tagline_ar: string;
  emoji: string;
  colorClass: string;
  group: CourseGroup;
  report: {
    essence: string;
    strengths: string[];
    blind_spots: string[];
    works_best: string;
    course_pitch: string;
  };
};

/**
 * Hand-written content. Keep each section short — the result page already
 * shows axis breakdown + course CTAs; long monologues hurt completion.
 */
export const PERSONALITY_TYPES: PersonalityType[] = [
  // ============================== ANALYSTS (NT) ==============================
  {
    code: 'INTJ',
    name_ar: 'الاستراتيجي',
    tagline_ar: 'بتلعب الشطرنج وأنت لسه قاعد على الكرسي بتفكر',
    emoji: '♟️',
    colorClass: 'from-indigo-600 to-purple-700',
    group: 'analysts',
    report: {
      essence:
        'بتفكر طويل، بتشوف اللعبة كاملة، وبتاخد قرارات قليلة بس حاسمة. ما بتسهلكش وقتك على تفاصيل ما بتفرّقش.',
      strengths: ['تفكير طويل المدى', 'استقلالية وثقة بالرأي', 'بتعرف تربط بين أشياء معقدة'],
      blind_spots: ['ساعات بتبقى جامد مع نفسك ومع الناس', 'بتصبر شوية في إنك تشرح فكرتك'],
      works_best:
        'لما تشتغل على مشكلة معقدة بحرية، مع فريق صغير ذكي، وحد يديك مساحة تنفّذ خطتك بالكامل.',
      course_pitch:
        'الـ Vibe Coding هيخلّيك تبني الـ vision اللي في دماغك بنفسك. مع n8n، هتحوّل الخطط لأنظمة شغالة.',
    },
  },
  {
    code: 'INTP',
    name_ar: 'الباحث',
    tagline_ar: 'بتفك المعضلة اللي محدش فاكرها أصلاً معضلة',
    emoji: '🔍',
    colorClass: 'from-sky-500 to-indigo-700',
    group: 'analysts',
    report: {
      essence:
        'فضولك ما له حدود. بتحلّل، بتربط، بتجرّب، ومش بتقبل إجابة سطحية. الـ "ليه" أهم عندك من الـ "إيه".',
      strengths: ['تفكير تحليلي عميق', 'مرونة في فهم الأنظمة', 'استقلالية ذهنية'],
      blind_spots: ['بتاخد وقت في القرار', 'ساعات بتيجي وقت التنفيذ تتعطّل'],
      works_best:
        'لما تشتغل لوحدك على مشكلة فيها تحدي عقلي. أكتر حاجة بتضيّعك: bureaucracy وروتين.',
      course_pitch:
        'ابدأ بأساسيات البرومبت — هتفك معاه الـ AI بطريقة عميقة. بعدها Vibe Coding يخلّيك تبني تجاربك.',
    },
  },
  {
    code: 'ENTJ',
    name_ar: 'القائد',
    tagline_ar: 'بتشوف الهدف من بعيد وبتعرف تحرّك الناس عشان توصلوله',
    emoji: '🎯',
    colorClass: 'from-amber-500 to-red-700',
    group: 'analysts',
    report: {
      essence:
        'عمليّ، حاسم، وعندك حس بيزنس قوي. بتتحمّل المسؤولية وبتخلي الـ team يطلّع أحسن نتيجة.',
      strengths: ['قيادة طبيعية', 'قرار سريع وحاسم', 'تخطيط استراتيجي'],
      blind_spots: ['ساعات بتدوس بسرعة على مشاعر الناس', 'بتصبر شوية مع البطء'],
      works_best:
        'لما تكون مسؤول عن نتيجة، مع فريق بيتنفذ، وحرية أنك تاخد القرار بدون موافقة 5 ناس فوقك.',
      course_pitch:
        'n8n هيخلّيك تأتمت أنظمة كاملة في شركتك. وأساسيات البرومبت تخلّيك تستخدم الـ AI زي مدير ذكي.',
    },
  },
  {
    code: 'ENTP',
    name_ar: 'المُبتكِر',
    tagline_ar: 'بتطلّع 10 أفكار في 5 دقايق، وفيهم 2 ممكن يغيّروا العالم',
    emoji: '💡',
    colorClass: 'from-fuchsia-500 to-rose-600',
    group: 'analysts',
    report: {
      essence:
        'مرن، فضولي، وبتعشق التحدي العقلي. بتتعلم بسرعة وبتقدر تربط بين أفكار من عوالم مختلفة.',
      strengths: ['إبداع وأفكار جديدة', 'سرعة تعلّم', 'تواصل مقنع'],
      blind_spots: ['بتتشتت بين أفكارك', 'بتسيب المشروع نص نص بعد الحماس الأول'],
      works_best:
        'في بيئة fast-moving، مع ناس بيقدروا يلحقوك. الـ MVP وإطلاق التجارب الصغيرة لعبتك.',
      course_pitch:
        'Vibe Coding هيخلّيك تجرّب أفكارك بسرعة. n8n يأتمت الـ ops عشان تبقى فاضي للأهم.',
    },
  },

  // ============================== DIPLOMATS (NF) ==============================
  {
    code: 'INFJ',
    name_ar: 'المُلهِم',
    tagline_ar: 'بتشوف اللي مش باين، وبتعمل حاجة بيها معنى',
    emoji: '🌌',
    colorClass: 'from-violet-600 to-indigo-700',
    group: 'diplomats',
    report: {
      essence:
        'هادي، عميق، وبتتأثر بالـ purpose. بتدوّر على رسالة تخدم الناس، مش بس وظيفة.',
      strengths: ['رؤية بعيدة', 'تعاطف وفهم للناس', 'تركيز عميق'],
      blind_spots: ['بتحط ضغط كبير على نفسك', 'بتعاني من الـ burnout'],
      works_best:
        'لما تشتغل على هدف بيلمس قلبك، في بيئة فيها احترام، ومع ناس بتقدّر العمق.',
      course_pitch:
        'كورس اكتشاف الشغف هيوضّحلك مجالك، ومحتوى الـ AI Video هياخدك مكان رسالتك توصل لناس كتير.',
    },
  },
  {
    code: 'INFP',
    name_ar: 'الحالِم',
    tagline_ar: 'القيم اللي في قلبك هي اللي بتحرّكك مش الكلام',
    emoji: '🦋',
    colorClass: 'from-pink-400 to-purple-600',
    group: 'diplomats',
    report: {
      essence:
        'حساس، إبداعي، ومتمسّك بقيمك. بتدور على شغل بيعبّر عن "أنت" الحقيقي مش بس بيدفعلك.',
      strengths: ['عمق إبداعي', 'أصالة', 'تعاطف عالي'],
      blind_spots: ['التطبيق العملي ساعات بيكون أصعب من الفكرة', 'النقد بيوصل لقلبك بسرعة'],
      works_best:
        'لوحدك في مكان هادي على مشروع له معنى. الـ deadline القاسي والفوضى بيخنقوك.',
      course_pitch:
        'اكتشاف الشغف هو نقطة البداية. بعدها AI Video هيخلّيك تحوّل أفكارك لمحتوى يلمس الناس.',
    },
  },
  {
    code: 'ENFJ',
    name_ar: 'المُوجِّه',
    tagline_ar: 'بتطلّع أحسن نسخة من الناس اللي حواليك',
    emoji: '🌟',
    colorClass: 'from-rose-500 to-pink-600',
    group: 'diplomats',
    report: {
      essence:
        'كاريزماتي، متعاطف، وعندك إحساس عالي بإن ده "صح" يقال لمين ومتى. بتلهم اللي بيشتغل معاك.',
      strengths: ['قيادة بالتعاطف', 'تواصل قوي', 'بتشوف نقط القوة في الناس'],
      blind_spots: ['بتنسى نفسك في خدمة الباقيين', 'بتاخد رفض حاجة شخصية'],
      works_best:
        'مع فريق بتلهمه. الـ teaching, coaching, content creation طبيعة شغلك.',
      course_pitch:
        'AI Video هيدّيك أداة قوية تعلّم وتلهم الناس بـ scale. واكتشاف الشغف هيوضّحلك على مين تركّز.',
    },
  },
  {
    code: 'ENFP',
    name_ar: 'المُحفِّز',
    tagline_ar: 'الطاقة معدية، والأفكار جاية بسرعة',
    emoji: '🎉',
    colorClass: 'from-yellow-400 to-orange-600',
    group: 'diplomats',
    report: {
      essence:
        'إيجابي، اجتماعي، ومتحمّس لكل فكرة جديدة. بتربط الناس ببعض وبتخلّق طاقة في أي غرفة بتدخلها.',
      strengths: ['كاريزما', 'إبداع', 'بتعرف تكوّن network قوي'],
      blind_spots: ['بتقفز بين الأفكار بدون ما تخلّص', 'الروتين عدوك'],
      works_best:
        'في بيئة فيها ناس وحركة. لما يديك حد يساعدك في الـ follow-through.',
      course_pitch:
        'AI Video مساحة بتعبّر فيها بسرعة، واكتشاف الشغف هيختار من بين كل الأفكار اللي عندك.',
    },
  },

  // ============================== SENTINELS (SJ) ==============================
  {
    code: 'ISTJ',
    name_ar: 'المنظِّم',
    tagline_ar: 'بتعمل الحاجة صح، مش حلوة وبس',
    emoji: '🗂️',
    colorClass: 'from-slate-600 to-gray-800',
    group: 'sentinels',
    report: {
      essence:
        'موثوق، عملي، ومنظّم. الناس بتسلّملك الحاجة وعارفة إنها هتتنفّذ بالظبط. الكلام الكتير ما بيلهمكش.',
      strengths: ['دقة في التنفيذ', 'انضباط', 'موثوق فيك'],
      blind_spots: ['بتقاوم التغيير المفاجئ', 'بتاخد وقت في قبول أفكار جديدة'],
      works_best:
        'مع نظام واضح، أهداف محددة، وفريق بيعمل اللي اتفقتوا عليه.',
      course_pitch:
        'عزّز إنتاجيتك يبني نظامك. وn8n يأتمت كل المهام المتكررة فبتركّز على اللي مهم.',
    },
  },
  {
    code: 'ISFJ',
    name_ar: 'الراعي',
    tagline_ar: 'بتلاحظ كل التفاصيل اللي مهم الناس عنها',
    emoji: '🌿',
    colorClass: 'from-emerald-500 to-teal-700',
    group: 'sentinels',
    report: {
      essence:
        'دافي، صبور، وملاحظ. بتاخد على عاتقك مسؤولية إن الجو يبقى ريّق والشغل يطلع بدقة.',
      strengths: ['ولاء', 'انتباه للتفاصيل', 'تعاطف عملي'],
      blind_spots: ['بتعاني من إعطاء "لأ"', 'ساعات بتحمل لوحدك أكتر من اللازم'],
      works_best:
        'في فريق متعاون مع structure واضح. الفوضى والصراع بيتعبوك.',
      course_pitch:
        'عزّز إنتاجيتك يحميك من الـ burnout. وn8n يخلّيك تأتمت اللي بياخد منك وقت من غير ما يضيف قيمة.',
    },
  },
  {
    code: 'ESTJ',
    name_ar: 'المدير',
    tagline_ar: 'بتجمع الناس حواليك وبيخلّصوا',
    emoji: '📋',
    colorClass: 'from-blue-600 to-indigo-800',
    group: 'sentinels',
    report: {
      essence:
        'حازم، منظّم، وعندك حس قيادة طبيعي. بتعرف توزّع المسؤوليات وتطلّع نتيجة من فريق.',
      strengths: ['تنظيم', 'حسم', 'موثوقية'],
      blind_spots: ['ساعات بتاخد التغيير شخصياً', 'بتدوس على المرونة في سبيل النظام'],
      works_best:
        'لما تكون مسؤول عن operations في شركة بتنمو، مع فريق بيلتزم.',
      course_pitch:
        'n8n هياخدك في رحلة بتاع الـ ops manager للجيل الجديد. وعزّز إنتاجيتك يدّيك أدواتك الشخصية.',
    },
  },
  {
    code: 'ESFJ',
    name_ar: 'الداعِم',
    tagline_ar: 'بتتأكد إن كل واحد في الفريق بخير',
    emoji: '☕',
    colorClass: 'from-orange-400 to-rose-600',
    group: 'sentinels',
    report: {
      essence:
        'دافي، اجتماعي، وحساس لاحتياجات الناس. بتلعب دور القلب اللي بيحافظ على الفريق متماسك.',
      strengths: ['تواصل', 'تنظيم', 'دعم متفاني'],
      blind_spots: ['نقد بسيط ممكن يجرحك', 'بتنسى نفسك'],
      works_best:
        'مع ناس بتقدّرك، structure واضح، وعلاقات مستمرة.',
      course_pitch:
        'عزّز إنتاجيتك يحمي وقتك. وn8n يأتمت الإداريات عشان تركّز في اللي بتحبه أكتر — مساعدة الناس.',
    },
  },

  // ============================== EXPLORERS (SP) ==============================
  {
    code: 'ISTP',
    name_ar: 'الصانِع',
    tagline_ar: 'بتفك الحاجة عشان تفهمها وبتركّبها أحسن',
    emoji: '🔧',
    colorClass: 'from-stone-600 to-zinc-800',
    group: 'explorers',
    report: {
      essence:
        'عملي، هادي، وذكي بإيدك ودماغك. بتحب اللي يشتغل، وما عندكش وقت للنظريات اللي ما بتطبّقش.',
      strengths: ['حل مشاكل عملي', 'تحت الضغط بتبقى احسن', 'استقلالية'],
      blind_spots: ['التعبير عن المشاعر مش لعبتك', 'الـ planning طويل المدى ساعات بيتاخر'],
      works_best:
        'لوحدك أو في فريق صغير، تحدّي عملي، وحرية تحلّ بطريقتك.',
      course_pitch:
        'Vibe Coding هيدّيك أدوات تبني بيها بسرعة. وAI Video لو حبيت تشارك اللي بتعمله.',
    },
  },
  {
    code: 'ISFP',
    name_ar: 'الفنّان',
    tagline_ar: 'بتعمل الحاجة وأنت حسّاسها مش بس عاملها',
    emoji: '🎨',
    colorClass: 'from-pink-300 to-rose-600',
    group: 'explorers',
    report: {
      essence:
        'حساس جمالياً، بتشتغل بمزاجك، وبتنتج حاجة بتلمس الناس. ما بتتكلمش كتير عن اللي بتعمله — بتعمله.',
      strengths: ['ذوق فني', 'صدق', 'تركيز على اللحظة'],
      blind_spots: ['بتأجل القرارات الكبيرة', 'النقد بيهز ثقتك'],
      works_best:
        'في مساحة هادية حرة، مع ناس بتقدّر الفن. الـ deadline الجامد بيقتل إبداعك.',
      course_pitch:
        'AI Video مساحة بتعبّر فيها بصرياً، وVibe Coding يدّيك أدوات تبني بيها projects ينعكسوا فيك.',
    },
  },
  {
    code: 'ESTP',
    name_ar: 'المُغامِر',
    tagline_ar: 'بتقرر وتنفّذ في نفس اللحظة',
    emoji: '⚡',
    colorClass: 'from-orange-500 to-red-700',
    group: 'explorers',
    report: {
      essence:
        'سريع، براغماتي، وعملي. الـ action هو لغتك، والـ overthinking عدوك. بتعرف توصل لنتيجة لما الآخرين لسه بيخططوا.',
      strengths: ['سرعة قرار', 'كاريزما', 'بتشتغل تحت الضغط'],
      blind_spots: ['بتسيب التفاصيل الدقيقة', 'النظر طويل المدى مش لعبتك'],
      works_best:
        'في بيئة fast-paced، مع نتائج سريعة، وحرية حركة.',
      course_pitch:
        'AI Video هيدّيك سلاح content حاد. وVibe Coding بتبني بيه prototypes تجرّبها في السوق فوراً.',
    },
  },
  {
    code: 'ESFP',
    name_ar: 'النجم',
    tagline_ar: 'بتنوّر أي غرفة، وبتعدّي الموقف من غير مجهود',
    emoji: '🎭',
    colorClass: 'from-yellow-400 to-pink-600',
    group: 'explorers',
    report: {
      essence:
        'اجتماعي، حيوي، وبتعيش اللحظة. بتعرف تخلق طاقة وبتقرّب الناس من بعض، وعندك حس performance طبيعي.',
      strengths: ['كاريزما', 'تواصل', 'مرونة'],
      blind_spots: ['التخطيط طويل المدى', 'بتميل تتجنّب المواجهات'],
      works_best:
        'مع ناس وطاقة وlight structure. الروتين والـ isolation أكتر حاجة بتزهقك.',
      course_pitch:
        'AI Video مكانك الطبيعي — هتبني presence رقمي قوي. وVibe Coding يدّيك تجربة بناء أداتك الخاصة.',
    },
  },
];

const BY_CODE = new Map(PERSONALITY_TYPES.map((t) => [t.code, t]));

export function getType(code: string): PersonalityType | undefined {
  return BY_CODE.get(code);
}

export function getTypeOrFallback(code: string): PersonalityType {
  return getType(code) ?? PERSONALITY_TYPES[0];
}
