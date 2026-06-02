import type { BandId, DomainId } from './types';

export type Domain = {
  id: DomainId;
  name_ar: string;
  short_ar: string;
  description_ar: string;
  /** Concrete habits when this is the user's growth area. */
  growth_tips_ar: string[];
  /** Strength-statement when this is the user's superpower. */
  strength_statement_ar: string;
  emoji: string;
};

export const DOMAINS: Domain[] = [
  {
    id: 'self_awareness',
    name_ar: 'الوعي بالذات',
    short_ar: 'بتفهم نفسك',
    description_ar:
      'بتعرف مشاعرك بمجرد ما تظهر، وبتفهم تأثيرها على قراراتك. ده الأساس اللي بتتبني عليه باقي مهارات الـ EQ.',
    growth_tips_ar: [
      'اكتب 3 سطور كل ليلة عن أكتر لحظة حسّيت فيها بمشاعر قوية',
      'اسأل نفسك "إيه اللي بحس بيه دلوقتي؟" قبل ما تاخد قرار مهم',
      'لاحظ النمط في مشاعرك على مدار أسبوع — هتشوف تريجرز ثابتة',
    ],
    strength_statement_ar:
      'الوعي بالذات هو الـ superpower بتاعك — بتعرف نفسك بدقة، وده اللي بيخلّيك تاخد قرارات أصدق من الباقيين.',
    emoji: '🪞',
  },
  {
    id: 'self_regulation',
    name_ar: 'ضبط النفس',
    short_ar: 'بتتحكم في ردود فعلك',
    description_ar:
      'بتعرف تهدّي نفسك قبل ما ترد، وما بتاخدش قرارات تحت ضغط لحظي. الـ self-regulation بتميّز اللي بيقود نفسه عن اللي مشاعره بتقوده.',
    growth_tips_ar: [
      'قبل ما ترد على رسالة استفزّتك، استنى 10 دقايق على الأقل',
      'تنفّس عميق 4 ثواني × 4 ثواني × 4 — أبسط أداة لتهدئة الجسد',
      'حدد "موسم انفعالات" بتاعك (وقت قبل النوم؟ بعد الشغل؟) وتجنّب القرارات وقتها',
    ],
    strength_statement_ar:
      'ضبط النفس هو الـ superpower بتاعك — بتحت الضغط بتفضل واضح وعقلاني، وده نادر جداً.',
    emoji: '🧘',
  },
  {
    id: 'empathy',
    name_ar: 'التعاطف',
    short_ar: 'بتحس بالناس',
    description_ar:
      'بتقرأ مشاعر الناس من غير ما يقولوا. الـ empathy مش بس "طيبة" — دي مهارة بتخلّيك تفهم احتياجات حقيقية ورا الكلام.',
    growth_tips_ar: [
      'في الحوار، ركّز على فهم الشخص قبل ما ترد — أعد قول اللي قاله بكلماتك',
      'لاحظ نبرة الصوت وتعبيرات الوش، مش بس الكلام',
      'اقرأ كتاب فيكشن — بيدرّب الـ empathy أكتر من أي تمرين تاني',
    ],
    strength_statement_ar:
      'التعاطف هو الـ superpower بتاعك — الناس بتحس إنك "بتفهمها فعلاً"، وده اللي بيبني علاقات دائمة.',
    emoji: '💞',
  },
  {
    id: 'social_skills',
    name_ar: 'المهارات الاجتماعية',
    short_ar: 'بتدير العلاقات',
    description_ar:
      'بتعرف تتنقل بين الناس، تحوّي الخلاف، وتبني ثقة بسرعة. ده اللي بيخلّي إنك تكبّر شبكة علاقاتك وتقود فرق.',
    growth_tips_ar: [
      'في أي خلاف، ابدأ بـ "أنا فاهم رأيك، خليني أقولّك اللي شايفه" — مش بـ "بس..."',
      'تواصل مع شخص جديد كل أسبوع بدون هدف محدد — استثمار طويل المدى',
      'لما حد يساعدك، اشكره بالتفصيل (مش بس "شكراً") — ده اللي بيخلّيه يحبك',
    ],
    strength_statement_ar:
      'المهارات الاجتماعية هي الـ superpower بتاعك — بتجمع الناس حواليك بسهولة، وده capital أقوى من أي شهادة.',
    emoji: '🤝',
  },
];

const BY_ID = new Map(DOMAINS.map((d) => [d.id, d]));
export function getDomain(id: DomainId): Domain {
  return BY_ID.get(id) ?? DOMAINS[0];
}

export type Band = {
  id: BandId;
  name_ar: string;
  tagline_ar: string;
  description_ar: string;
  emoji: string;
  colorClass: string;
};

export const BANDS: Band[] = [
  {
    id: 'growing',
    name_ar: 'في فرصة كبيرة للنمو',
    tagline_ar: 'الـ EQ مهارة بتتبني — مش صفة بتتولد بيها',
    description_ar:
      'نتيجتك بتقول إن فيه مساحة كبيرة لتطوير الـ EQ. الحاجة الإيجابية: الـ EQ من أسرع المهارات في التطور لما تركّز عليها. كل دقيقة بتقضيها في التأمل = نقطة في الـ score.',
    emoji: '🌱',
    colorClass: 'from-pink-400 to-rose-600',
  },
  {
    id: 'balanced',
    name_ar: 'متوازن — بتطور',
    tagline_ar: 'عندك أساس، باقي تشد على نقطة محددة',
    description_ar:
      'الـ EQ عندك في الـ healthy range. عندك نقاط قوة واضحة، وفي مجال واحد لو ركّزت عليه شوية، هيتحرك المؤشر العام لفوق.',
    emoji: '🪷',
    colorClass: 'from-pink-500 to-fuchsia-700',
  },
  {
    id: 'high',
    name_ar: 'عالي — نقطة قوة طبيعية',
    tagline_ar: 'الـ EQ سلاحك الخفي — استخدمه',
    description_ar:
      'الـ EQ عندك عالي، وده نوع من الذكاء بيفرّق في الحياة العملية أكتر من الـ IQ. خد بالك: الـ EQ العالي بدون توجيه ممكن يخلّيك تعمل اللي يرضي الناس مش اللي يخدمك.',
    emoji: '✨',
    colorClass: 'from-fuchsia-600 to-purple-700',
  },
];

const BAND_BY_ID = new Map(BANDS.map((b) => [b.id, b]));
export function getBand(id: BandId): Band {
  return BAND_BY_ID.get(id) ?? BANDS[1];
}
