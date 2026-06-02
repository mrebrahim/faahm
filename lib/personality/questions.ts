import type { PersonalityQuestion } from './types';

/**
 * 32 Egyptian-Arabic Likert statements — 8 per dichotomy, balanced 4 toward
 * each pole so an even score is rare. Statements are interleaved across
 * axes so the user doesn't notice the structure (mitigates response bias).
 *
 * All copy is original — no MBTI / 16personalities phrasing per PRD §2.
 */
export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  // EI
  { id: 'q01', axis: 'EI', pole: 'E', text: 'في وسط ناس كتير بحسّ إني بشحن طاقة مش بفقدها.' },
  { id: 'q02', axis: 'SN', pole: 'S', text: 'بركّز في التفاصيل والحقائق اللي قدامي أكتر من الاحتمالات.' },
  { id: 'q03', axis: 'TF', pole: 'T', text: 'لما أقرر، المنطق بيغلب على إحساسي.' },
  { id: 'q04', axis: 'JP', pole: 'J', text: 'بحب الخطة الواضحة والمواعيد المحددة.' },

  { id: 'q05', axis: 'EI', pole: 'I', text: 'بفضّل أفكّر لوحدي قبل ما أقول رأيي.' },
  { id: 'q06', axis: 'SN', pole: 'N', text: 'بتشد انتباهي الأفكار الكبيرة و"ممكن يحصل إيه".' },
  { id: 'q07', axis: 'TF', pole: 'F', text: 'بحط مشاعر الناس في الحسبان حتى لو ضد المنطق.' },
  { id: 'q08', axis: 'JP', pole: 'P', text: 'بحب أسيب الباب مفتوح وأقرر وأنا ماشي.' },

  { id: 'q09', axis: 'EI', pole: 'E', text: 'بدخل في كلام مع غريب من غير ما أحسّ بأي حرج.' },
  { id: 'q10', axis: 'SN', pole: 'S', text: 'لما أتعلم حاجة جديدة، بحب أمثلة عملية أكتر من نظريات.' },
  { id: 'q11', axis: 'TF', pole: 'T', text: 'نقد الفكرة (مش الشخص) ما بيتعبنيش، المهم تطلع صح.' },
  { id: 'q12', axis: 'JP', pole: 'J', text: 'بحس بارتياح لما أخلّص الحاجة قبل وقتها.' },

  { id: 'q13', axis: 'EI', pole: 'I', text: 'بعد يوم بين ناس كتير بحس إني محتاج وقت لوحدي عشان أرتاح.' },
  { id: 'q14', axis: 'SN', pole: 'N', text: 'بحب أربط بين فكرة وفكرة وأشوف الـ pattern.' },
  { id: 'q15', axis: 'TF', pole: 'F', text: 'بحس بسرعة لما حد حواليّا متضايق حتى لو ما قالش.' },
  { id: 'q16', axis: 'JP', pole: 'P', text: 'بشتغل أحسن لما يبقى عندي حرية أغيّر الخطة في أي وقت.' },

  { id: 'q17', axis: 'EI', pole: 'E', text: 'بحب أشتغل في جو فيه حركة وناس حواليّا.' },
  { id: 'q18', axis: 'SN', pole: 'S', text: 'بثق في تجربتي وخبرتي السابقة أكتر من حدسي.' },
  { id: 'q19', axis: 'TF', pole: 'T', text: 'بقيّم القرارات بنتيجتها العملية مش بمشاعرها.' },
  { id: 'q20', axis: 'JP', pole: 'J', text: 'بكره ما أعرفش هعمل إيه بكره.' },

  { id: 'q21', axis: 'EI', pole: 'I', text: 'ما بفتحش موضوع جديد مع حد ما أعرفش إلا لو ضروري.' },
  { id: 'q22', axis: 'SN', pole: 'N', text: 'بشتغل ذهني في المستقبل أكتر ما بفكر في النهارده.' },
  { id: 'q23', axis: 'TF', pole: 'F', text: 'الانسجام في الفريق أهم عندي من اللي صح تقني.' },
  { id: 'q24', axis: 'JP', pole: 'P', text: 'بدوّر على فرص جديدة حتى لو الخطة الأصلية ماشية كويس.' },

  { id: 'q25', axis: 'EI', pole: 'E', text: 'بتكلم بسهولة قدام مجموعة كبيرة.' },
  { id: 'q26', axis: 'SN', pole: 'S', text: 'بفضّل الخطوات الواضحة والمحددة على الأفكار العامة.' },
  { id: 'q27', axis: 'TF', pole: 'T', text: 'بحاول أحلّل الموقف بأعصاب باردة قبل ما أتدخل.' },
  { id: 'q28', axis: 'JP', pole: 'J', text: 'بفضل قائمة مهام مكتوبة وأخلّصها واحدة واحدة.' },

  { id: 'q29', axis: 'EI', pole: 'I', text: 'بحب اللي يخلّيني أفكر بعمق أكتر من اللي يخلّيني أتكلم بسرعة.' },
  { id: 'q30', axis: 'SN', pole: 'N', text: 'ساعات بحس إن عندي حدس بحاجة قبل ما تحصل.' },
  { id: 'q31', axis: 'TF', pole: 'F', text: 'ساعات أوافق على حاجة عشان مش عاوز أزعّل حد.' },
  { id: 'q32', axis: 'JP', pole: 'P', text: 'بأجّل الحاجات لحد ما الـ deadline يقرب — أحسن وقت أبدع فيه.' },
];

/** 5-point scale labels for the UI. Index 0 = strongly disagree, 4 = strongly agree. */
export const LIKERT_LABELS = [
  'مش موافق خالص',
  'مش موافق',
  'متعادل',
  'موافق',
  'موافق جداً',
] as const;
