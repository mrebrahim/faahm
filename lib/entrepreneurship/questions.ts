import type { EntrepreneurshipQuestion } from './types';

/**
 * 14 scored + 1 work_type = 15 items. Each scored option's value
 * (0..3) reflects how 'entrepreneurial' that choice is — 0 = totally
 * passive, 3 = high-agency / risk-tolerant. The values map cleanly
 * to the final score and the biggest-gap detection.
 *
 * Interleaved across dimensions so users don't catch on to the
 * scoring pattern.
 */
export const ENTREPRENEURSHIP_QUESTIONS: EntrepreneurshipQuestion[] = [
  // RT1
  {
    id: 'e1',
    kind: 'scored',
    dimension: 'risk_tolerance',
    prompt: 'مرتاح أكتر مع:',
    options: [
      { value: 0, label: 'راتب ثابت مضمون' },
      { value: 1, label: 'راتب أقل بس فيه upside' },
      { value: 2, label: 'بين الاتنين' },
      { value: 3, label: 'دخل متغيّر بس سقفه أعلى بكتير' },
    ],
  },
  // SD1
  {
    id: 'e2',
    kind: 'scored',
    dimension: 'self_direction',
    prompt: 'لما تشتغل من غير مدير بيراقبك:',
    options: [
      { value: 0, label: 'بضيع، محتاج حد يقولي أعمل إيه' },
      { value: 1, label: 'بتعطل شوية بس بنجز' },
      { value: 2, label: 'بنجز كويس' },
      { value: 3, label: 'بنجز أكتر، الـ structure بيخنقني' },
    ],
  },
  // SC1
  {
    id: 'e3',
    kind: 'scored',
    dimension: 'sales_comm',
    prompt: 'مرتاح تكلّم عميل وتقنعه بخدمتك؟',
    options: [
      { value: 0, label: 'مستحيل، أكره ده' },
      { value: 1, label: 'بصعوبة' },
      { value: 2, label: 'عادي' },
      { value: 3, label: 'أحب الـ challenge' },
    ],
  },
  // SF1
  {
    id: 'e4',
    kind: 'scored',
    dimension: 'skill_foundation',
    prompt: 'عندك دلوقتي مهارة تقدر تبيعها أونلاين؟',
    options: [
      { value: 0, label: 'لأ خالص' },
      { value: 1, label: 'شوية' },
      { value: 2, label: 'أيوة، بس محتاجة تطوير' },
      { value: 3, label: 'أيوة، عندي تجارب فعلية' },
    ],
  },
  // R1
  {
    id: 'e5',
    kind: 'scored',
    dimension: 'resourcefulness',
    prompt: 'لقيت فرصة محتاجة مهارة معندكش — أول حاجة:',
    options: [
      { value: 0, label: 'أسيبها' },
      { value: 1, label: 'أستنى لحد ما أتعلمها بشكل رسمي' },
      { value: 2, label: 'أدوّر على حد يعملها (outsource)' },
      { value: 3, label: 'أتعلمها بسرعة من YouTube + AI' },
    ],
  },
  // RT2
  {
    id: 'e6',
    kind: 'scored',
    dimension: 'risk_tolerance',
    prompt: 'لو هتبدأ بيزنس وفيه 50% احتمال يفشل في أول 6 شهور:',
    options: [
      { value: 0, label: 'مفيش طريقة، الأمان أهم' },
      { value: 1, label: 'هحاول بحذر شديد' },
      { value: 2, label: 'أعمل وأشوف' },
      { value: 3, label: 'أعمل بحماس — كل مشروع فيه risk' },
    ],
  },
  // SD2
  {
    id: 'e7',
    kind: 'scored',
    dimension: 'self_direction',
    prompt: 'في يوم فاضي بدون مواعيد، عادةً بتعمل إيه:',
    options: [
      { value: 0, label: 'بضيع وقت كتير' },
      { value: 1, label: 'بحاول أنظم بس بتشتت' },
      { value: 2, label: 'بحط خطة شخصية وبنفذها جزئياً' },
      { value: 3, label: 'بحط خطة محكمة وبنفذها' },
    ],
  },
  // SC2
  {
    id: 'e8',
    kind: 'scored',
    dimension: 'sales_comm',
    prompt: 'لو عميل رفض سعرك المرتفع:',
    options: [
      { value: 0, label: 'أوافق على سعره' },
      { value: 1, label: 'أتنازل شوية' },
      { value: 2, label: 'أشرحله القيمة وأحافظ على سعري' },
      { value: 3, label: 'أتفاوض من موقف القوة' },
    ],
  },
  // SF2
  {
    id: 'e9',
    kind: 'scored',
    dimension: 'skill_foundation',
    prompt: 'كسبت قبل كده فلوس من شغل حر أو online؟',
    options: [
      { value: 0, label: 'لأ' },
      { value: 1, label: 'مرة واحدة' },
      { value: 2, label: '2-3 مرات' },
      { value: 3, label: 'دخل ثابت من شغل حر' },
    ],
  },
  // R2
  {
    id: 'e10',
    kind: 'scored',
    dimension: 'resourcefulness',
    prompt: 'لو في tool بيكلف $50/شهر بس هيوفّر عليك ساعات:',
    options: [
      { value: 0, label: 'مش هصرف، أعمل بإيدي' },
      { value: 1, label: 'هحاول ألاقي بديل مجاني' },
      { value: 2, label: 'أصرف لو مضطر' },
      { value: 3, label: 'أصرف فوراً — الوقت أغلى' },
    ],
  },
  // RT3
  {
    id: 'e11',
    kind: 'scored',
    dimension: 'risk_tolerance',
    prompt: 'لو في شغل بدخل ضعف اللي بتكسبه دلوقتي بس مش مضمون:',
    options: [
      { value: 0, label: 'مستحيل أسيب الـ stability' },
      { value: 1, label: 'هحاول أوفّق بين الاتنين' },
      { value: 2, label: 'أحاول لو لقيت backup' },
      { value: 3, label: 'أيوة، الفرصة جدية' },
    ],
  },
  // SD3
  {
    id: 'e12',
    kind: 'scored',
    dimension: 'self_direction',
    prompt: 'لو حد سألك "إيه خطتك للأسبوع الجاي؟":',
    options: [
      { value: 0, label: 'مالهاش خطة، شوف اللي يجي' },
      { value: 1, label: 'عندي goal واحد كبير' },
      { value: 2, label: 'عندي 3-4 أولويات واضحة' },
      { value: 3, label: 'عندي خطة مفصّلة بأوقات' },
    ],
  },
  // SC3
  {
    id: 'e13',
    kind: 'scored',
    dimension: 'sales_comm',
    prompt: 'نشرت بوست عن خدمتك ومحدش رد:',
    options: [
      { value: 0, label: 'أتوقف، الناس مش مهتمة' },
      { value: 1, label: 'أحاول مرة أخرى' },
      { value: 2, label: 'أحلل ليه وأجرب تاني' },
      { value: 3, label: 'عادي، الـ cold outreach لعبة أرقام' },
    ],
  },
  // SF3
  {
    id: 'e14',
    kind: 'scored',
    dimension: 'skill_foundation',
    prompt: 'عندك portfolio أو حسابات اجتماعية بتعرض شغلك؟',
    options: [
      { value: 0, label: 'لأ' },
      { value: 1, label: 'حسابات شخصية' },
      { value: 2, label: 'حسابات مهنية بشغل قديم' },
      { value: 3, label: 'حسابات مهنية + portfolio محدّث' },
    ],
  },
  // Work-type routing — signal only, not scored.
  {
    id: 'e15',
    kind: 'work_type',
    prompt: 'لو هتكسب من الـ AI، أكتر طريقة بتشدّك:',
    options: [
      { value: 'service', label: 'أبيع خدماتي (أتمتة، تسويق، شغل عميل)' },
      { value: 'product', label: 'أبني منتج / تطبيق وأبيعه' },
      { value: 'content', label: 'أعمل محتوى وأبني audience' },
      { value: 'unclear', label: 'لسه مش متأكد' },
    ],
  },
];
