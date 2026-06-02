import type { ProductivityQuestion } from './types';

/**
 * 14 scenarios. Every option maps cleanly to exactly one of the four
 * blockers — no shared loadings — so the dominant blocker emerges
 * deterministically from the answer counts.
 *
 * Wording stays warm and conversational per PRD §4 — never clinical,
 * never 'are you broken?'
 */
export const PRODUCTIVITY_QUESTIONS: ProductivityQuestion[] = [
  {
    id: 'p1',
    prompt: 'بتأجّل أكتر لما:',
    options: [
      { label: 'المهمة كبيرة ومش عارف أبدأ منين', blocker: 'overwhelm' },
      { label: 'حاسس إنها مش هتطلع مظبوطة', blocker: 'perfectionism' },
      { label: 'مفيش مود ولا تركيز', blocker: 'distraction' },
      { label: 'مش فاهم ليه بعملها أصلاً', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p2',
    prompt: 'لما بتفتح اللاب توب وتبدأ شغل، أول حاجة:',
    options: [
      { label: 'بفضل أبص في القائمة وما عرفش أختار منين', blocker: 'overwhelm' },
      { label: 'بفكر "خليني أنتظر لحد ما أبقى جاهز"', blocker: 'perfectionism' },
      { label: 'بفتح إيميلات أو سوشيال "بسرعة"', blocker: 'distraction' },
      { label: 'بسأل نفسي "ليه بعمل ده؟"', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p3',
    prompt: 'بتعمل خطة، لكن لما تيجي وقت التنفيذ بتلاقي:',
    options: [
      { label: 'الخطة كبيرة قوي ومش عارف أبدأ منين', blocker: 'overwhelm' },
      { label: 'بستنى اللحظة المناسبة عشان أبدأ صح', blocker: 'perfectionism' },
      { label: 'بدأت، بس انجذبت لحاجة تانية', blocker: 'distraction' },
      { label: 'بحس إنها مش بتستاهل التعب', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p4',
    prompt: 'لما يبقى عندك deadline قريب:',
    options: [
      { label: 'الضغط بيلخبطني وما عرفش أبدأ منين', blocker: 'overwhelm' },
      { label: 'بفكر إن لازم تطلع perfect حتى تحت الضغط', blocker: 'perfectionism' },
      { label: 'بتشتت أكتر، أصعب أركز', blocker: 'distraction' },
      { label: 'بفكر "إن ضاع، يضيع"', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p5',
    prompt: 'لو حد سألك "إيه اللي بيوقّفك من إنجاز اللي عاوزه؟":',
    options: [
      { label: '"حاجات كتير قوي مش عارف أبدأ منين"', blocker: 'overwhelm' },
      { label: '"خايف ما تطلعش زي ما بحلم بيها"', blocker: 'perfectionism' },
      { label: '"في حاجات تانية كتير بتشدّني"', blocker: 'distraction' },
      { label: '"مش متأكد إنها هدفي الحقيقي"', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p6',
    prompt: 'بتقرر تأجيل المهمة عادةً لما:',
    options: [
      { label: 'تشوف حجمها وتقول "ده كتير"', blocker: 'overwhelm' },
      { label: 'تحس إنك مش جاهز بعد', blocker: 'perfectionism' },
      { label: 'تتعرض لحاجة أحلى', blocker: 'distraction' },
      { label: 'تسأل نفسك "هل ده فعلاً مهم؟"', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p7',
    prompt: 'في أوقات راحتك بتفكر في شغلك إزاي:',
    options: [
      { label: '"ده كتير، مش هلحق أعمله كله"', blocker: 'overwhelm' },
      { label: '"اللي عملته كان فيه عيوب لازم أصلحها"', blocker: 'perfectionism' },
      { label: 'مش بفكر، بفتح فيديو تاني', blocker: 'distraction' },
      { label: '"هل ده فعلاً اللي عاوز أعمله؟"', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p8',
    prompt: 'لما بتشتغل وفي إشعار جالك:',
    options: [
      { label: 'بسيب التركيز عشان أنظّم اللي قدامي تاني', blocker: 'overwhelm' },
      { label: 'حسيت إن التركيز "اتقطع" — لازم أبدأ المهمة تاني', blocker: 'perfectionism' },
      { label: 'بدخل في الـ scroll ومش برجع بسرعة', blocker: 'distraction' },
      { label: 'مش بهمني، لأن المهمة مش مهمة أصلاً', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p9',
    prompt: 'لما بتفكر في الـ goals الكبيرة بتاعتك:',
    options: [
      { label: 'بحس إنها كبيرة قوي ومش هلحق', blocker: 'overwhelm' },
      { label: 'بحس إنها لو ما طلعتش perfect مش هتحلو', blocker: 'perfectionism' },
      { label: 'بفكر فيها، بعدها بفتح Instagram', blocker: 'distraction' },
      { label: 'بحس إن مش هي اللي عاوزها فعلاً', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p10',
    prompt: 'لما بتقفل اليوم وما خلصتش اللي خططت:',
    options: [
      { label: '"كان فيه حاجات أكتر من اللي قدرت"', blocker: 'overwhelm' },
      { label: '"ما عملتش حاجة كاملة 100%، فبلاش"', blocker: 'perfectionism' },
      { label: '"السوشيال خد مني وقت كبير"', blocker: 'distraction' },
      { label: '"أصلاً مش متأكد ليه عامل الخطة دي"', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p11',
    prompt: 'لما واحد بيقولك "ابدأ بحاجة صغيرة":',
    options: [
      { label: 'مش بفهم، عاوز أعمل كله مرة واحدة', blocker: 'overwhelm' },
      { label: 'بفكر إن الحاجة الصغيرة برده مش هتطلع perfect', blocker: 'perfectionism' },
      { label: 'بسيب الفكرة وأنجذب لحاجة تانية', blocker: 'distraction' },
      { label: 'بفكر "حتى الحاجة الصغيرة، ليه؟"', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p12',
    prompt: 'نفسك إن في حد يساعدك بإنه:',
    options: [
      { label: 'يقسّملك الحاجة الكبيرة لقطع صغيرة', blocker: 'overwhelm' },
      { label: 'يقولك "كده كافي، خلاص"', blocker: 'perfectionism' },
      { label: 'يقفل عليك الموبايل ساعتين', blocker: 'distraction' },
      { label: 'يقولك بصراحة هل ده اللي تستاهل تتعب عشانه', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p13',
    prompt: 'في الـ break بين المهام، أكتر حاجة بتعملها:',
    options: [
      { label: 'بحاول أنظّم اللي قدامي', blocker: 'overwhelm' },
      { label: 'بفكر "اللي عملته كان أحسن؟"', blocker: 'perfectionism' },
      { label: 'بفتح موبايل أو سوشيال', blocker: 'distraction' },
      { label: 'بسأل نفسي عن معنى اللي بعمله', blocker: 'low_clarity' },
    ],
  },
  {
    id: 'p14',
    prompt: 'لو لقيت 30 دقيقة فاضية فجأة، هتعمل بيهم:',
    options: [
      { label: 'أحاول أبدأ مهمة كنت بأجلها (بس هتقفش)', blocker: 'overwhelm' },
      { label: 'أحاول أنهي حاجة ضمنت نتيجتها', blocker: 'perfectionism' },
      { label: 'أفتح موبايل أو tab جديد', blocker: 'distraction' },
      { label: 'أفكر في خطتي الكبيرة', blocker: 'low_clarity' },
    ],
  },
];
