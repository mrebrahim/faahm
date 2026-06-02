import type { Question } from './types';

/**
 * 15 scenario-based questions. Each option carries a weighted vector
 * on (riasec, drivers, workStyle). Per PRD §7:
 *  - Every RIASEC axis gets ~3–4 scoring opportunities
 *  - Every driver gets ~2 opportunities
 *  - Two questions are explicit work-style sliders
 */
export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    prompt: 'قدامك مشكلة جديدة معندكش حل جاهز ليها. أول حاجة تعملها:',
    options: [
      { label: 'أبحث وأفكك المشكلة لحد ما أفهمها', riasec: { I: 2 } },
      { label: 'أجرّب وأبني حاجة بسرعة وأشوف هتشتغل ولا لأ', riasec: { R: 2 } },
      { label: 'أسأل ناس وأتناقش معاهم', riasec: { S: 2 } },
      { label: 'أعمل خطة منظمة وأمشي خطوة خطوة', riasec: { C: 2 } },
    ],
  },
  {
    id: 'q2',
    prompt: 'الحاجة اللي بتحس إنها بتشحنك في الشغل:',
    options: [
      { label: 'إني أبتكر حاجة جديدة محدش عملها', riasec: { A: 2 }, drivers: { creativity: 1 } },
      { label: 'إني أحل لغز/مشكلة معقدة', riasec: { I: 2 }, drivers: { mastery: 1 } },
      { label: 'إني أأثر في ناس وأقنعهم', riasec: { E: 2 }, drivers: { impact: 1 } },
      { label: 'إني أخلّي حاجة تشتغل صح وبدقة', riasec: { C: 2 }, drivers: { mastery: 1 } },
    ],
  },
  {
    id: 'q3',
    prompt: 'لو هتشتغل على مشروع شهر كامل، تختار:',
    options: [
      { label: 'أبني تطبيق أو أداة بتحل مشكلة', riasec: { R: 1, I: 1 } },
      { label: 'أعمل فيديوهات/محتوى يوصل لملايين', riasec: { A: 1, E: 1 } },
      { label: 'أبني سيستم بيشغّل بيزنس لوحده', riasec: { I: 1, C: 1 } },
      { label: 'أنظّم فريق ويطلع منه نتيجة كبيرة', riasec: { E: 1, S: 1 } },
    ],
  },
  {
    id: 'q4',
    prompt: 'في وقتك الفاضي بتلاقي نفسك:',
    options: [
      { label: 'بتعلم أداة أو تقنية جديدة', riasec: { I: 2 } },
      { label: 'بتعمل تصميم/مونتاج/كتابة', riasec: { A: 2 } },
      { label: 'بتتفرج وتحلل بيزنس ناجح إزاي بيكسب', riasec: { E: 2 } },
      { label: 'بترتّب وتظبّط حاجات حواليك', riasec: { C: 2 } },
    ],
  },
  {
    id: 'q5',
    prompt: 'لو خيّروك بين شغل مدفوع كويس بس ممل، وشغل بتحبه بس دخله أقل في الأول:',
    options: [
      { label: 'الشغل اللي بحبه، الفلوس هتيجي بعدين', drivers: { creativity: 2, freedom: 1 } },
      { label: 'شغل بحبه بس لازم يكسب من بدري', drivers: { impact: 1, income: 2 } },
      { label: 'الاستقرار أهم، الشغف هواية', drivers: { stability: 2 } },
      { label: 'اللي يخليني أتعلم وأكبر بسرعة', drivers: { mastery: 2 } },
    ],
  },
  {
    id: 'q6',
    prompt: 'أنت بتطلع أحسن نتيجة لما:',
    options: [
      { label: 'أشتغل لوحدي وبتركيز', workStyle: { team: -2 } },
      { label: 'أشتغل وسط فريق وطاقة', workStyle: { team: 2 } },
    ],
  },
  {
    id: 'q7',
    prompt: 'اللي بيريحك أكتر:',
    options: [
      { label: 'خطة واضحة وخطوات معروفة', workStyle: { flex: -2 } },
      { label: 'حرية أجرّب وأغيّر على الطريق', workStyle: { flex: 2 } },
    ],
  },
  {
    id: 'q8',
    prompt: 'الحاجة اللي الناس بتقولك إنك شاطر فيها من غير مجهود:',
    options: [
      { label: 'إنك بتفهم التقني بسرعة', riasec: { I: 2 } },
      { label: 'إنك بتعبّر وتقنع', riasec: { A: 1, E: 1 } },
      { label: 'إنك بتنظّم وتظبّط الفوضى', riasec: { C: 2 } },
      { label: 'إنك بتعمل حاجات بإيدك وتشتغل', riasec: { R: 2 } },
    ],
  },
  {
    id: 'q9',
    prompt: 'تخيّل بدأت بيزنس صغير. أكتر حاجة هتعجبك في رحلتك:',
    options: [
      { label: 'أبني المنتج بنفسي وأحسّنه طول الوقت', riasec: { R: 1, I: 1 }, drivers: { mastery: 1 } },
      { label: 'أحط ستراتيجية الـ marketing وأكبّر المبيعات', riasec: { E: 2 }, drivers: { income: 1 } },
      { label: 'أصمّم الـ brand وكل اللي يخلّيه يبان مميز', riasec: { A: 2 }, drivers: { creativity: 1 } },
      { label: 'أبني فريق وأكوّن ثقافة شغل قوية', riasec: { S: 1, E: 1 }, drivers: { impact: 1 } },
    ],
  },
  {
    id: 'q10',
    prompt: 'أكتر نوع كتاب/يوتيوبر بتتابعه:',
    options: [
      { label: 'تقني — يشرح أدوات وأكواد', riasec: { I: 2 } },
      { label: 'ريادة أعمال — قصص بيزنس وbuilders', riasec: { E: 1, I: 1 }, drivers: { mastery: 1 } },
      { label: 'إبداعي — تصميم، كتابة، فن', riasec: { A: 2 } },
      { label: 'تطوير ذاتي — عادات، إنتاجية، علم نفس', riasec: { S: 1, C: 1 }, drivers: { self_awareness: 1 } },
    ],
  },
  {
    id: 'q11',
    prompt: 'في موقف اجتماعي جديد (شغل أو لقاء)، أنت:',
    options: [
      { label: 'أبدأ كلام مع ناس وأبني علاقات', riasec: { S: 2, E: 1 } },
      { label: 'أراقب وألاحظ قبل ما أتدخل', riasec: { I: 2 }, workStyle: { team: -1 } },
      { label: 'بدور على لحظة أعرض فيها فكرتي', riasec: { E: 2 } },
      { label: 'أتكلم لو الموضوع بيهمني فعلاً', workStyle: { team: -1 } },
    ],
  },
  {
    id: 'q12',
    prompt: 'لو واحد قال لك "احكيلي تجربة فخور بيها"، هتحكي:',
    options: [
      { label: 'حاجة عملتها وحلّت مشكلة لناس', riasec: { R: 1, I: 1 }, drivers: { impact: 1 } },
      { label: 'محتوى نشرته ولاقى انتشار', riasec: { A: 1, E: 1 }, drivers: { creativity: 1 } },
      { label: 'فريق قدته أو ساعدت ناس تتطور', riasec: { S: 2 }, drivers: { impact: 1 } },
      { label: 'سيستم بنيته خلّى حاجة تشتغل ذاتياً', riasec: { I: 1, C: 1 }, drivers: { mastery: 1 } },
    ],
  },
  {
    id: 'q13',
    prompt: 'الحاجة اللي بتحس فيها بالملل الشديد:',
    options: [
      { label: 'الاجتماعات والكلام الطويل بدون تنفيذ', riasec: { R: 1, I: 1 } },
      { label: 'الروتين وتكرار نفس الحاجة كل يوم', riasec: { A: 1 }, drivers: { freedom: 1 } },
      { label: 'الشغل اللوحدي بدون أي تفاعل', riasec: { S: 1, E: 1 }, workStyle: { team: 1 } },
      { label: 'الفوضى وعدم وجود خطة', riasec: { C: 2 }, workStyle: { flex: -1 } },
    ],
  },
  {
    id: 'q14',
    prompt: 'بعد ٥ سنين، تتمنى الناس تعرفك بإيه؟',
    options: [
      { label: 'صاحب مهارة تقنية عالية محدش يقدر يعملها زيي', riasec: { I: 1, C: 1 }, drivers: { mastery: 2 } },
      { label: 'صاحب صوت/أسلوب فني مميز', riasec: { A: 2 }, drivers: { creativity: 1 } },
      { label: 'قائد بنى شركة أو فريق غيّر سوق', riasec: { E: 2 }, drivers: { impact: 1, income: 1 } },
      { label: 'شخص ساعد ناس كتير تكبر وتنجح', riasec: { S: 2 }, drivers: { impact: 1 } },
    ],
  },
  {
    id: 'q15',
    prompt: 'لو كان عندك يوم كامل تعمله مع AI، هتعمل بيه:',
    options: [
      { label: 'أتمتة شغل ممل بحيث يحصل لوحده', riasec: { I: 1, C: 1 }, drivers: { mastery: 1 } },
      { label: 'أعمل برنامج كامل بدون كود', riasec: { I: 1, A: 1 }, drivers: { creativity: 1 } },
      { label: 'فيديوهات/محتوى تسويقي بأقل وقت', riasec: { A: 1, E: 1 }, drivers: { creativity: 1 } },
      { label: 'أحلل بيانات وأطلع منها استنتاجات', riasec: { I: 2 }, drivers: { mastery: 1 } },
    ],
  },
];

/** Initial scores — used by tally(). */
export function emptyScores() {
  return {
    riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 } as Record<
      'R' | 'I' | 'A' | 'S' | 'E' | 'C',
      number
    >,
    drivers: {
      impact: 0,
      income: 0,
      freedom: 0,
      creativity: 0,
      mastery: 0,
      stability: 0,
      self_awareness: 0,
    },
    workStyle: { team: 0, flex: 0 },
  };
}
