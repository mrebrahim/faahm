import type { SelfDiscoveryQuestion } from './types';

/**
 * 12 tappable + 2 optional reflection prompts. Soft, projective wording
 * per PRD §3 — never 'rate yourself', always 'imagine / when / who'.
 *
 * Each tappable option spreads weight across 1–2 themes; no option
 * loads all themes equally (defeats the point) and no theme is rare
 * across the bank.
 */
export const SELF_DISCOVERY_QUESTIONS: SelfDiscoveryQuestion[] = [
  {
    id: 's1',
    kind: 'choice',
    prompt: 'لو الفلوس مش مشكلة خالص، هتقضي يومك في إيه؟',
    options: [
      { label: 'أتعلم وأتعمق في موضوع بيشدّني', themes: { mastery: 2 } },
      { label: 'أبني حاجة بإيدي — مشروع، منتج، أداة', themes: { building: 2 } },
      { label: 'أعمل محتوى/فن يلمس الناس', themes: { creating: 2 } },
      { label: 'أساعد ناس وأشتغل معاهم', themes: { impact: 2 } },
    ],
  },
  {
    id: 's2',
    kind: 'choice',
    prompt: 'آخر مرة نسيت الوقت وأنت بتعمل حاجة — كانت إيه؟',
    options: [
      { label: 'بفكك مشكلة معقّدة', themes: { mastery: 1, building: 1 } },
      { label: 'بصمم/أكتب/أصوّر', themes: { creating: 2 } },
      { label: 'بتكلم مع شخص بيشاركني فكرة عميقة', themes: { impact: 2 } },
      { label: 'بنظّم وأخلّص قائمة طويلة', themes: { execution: 2 } },
    ],
  },
  {
    id: 's3',
    kind: 'choice',
    prompt: 'إيه الحاجة اللي بتزعّلك لما تشوفها بتحصل غلط في العالم؟',
    options: [
      { label: 'الناس بتتصرف بدون فهم', themes: { mastery: 2 } },
      { label: 'حاجات حلوة بتضيع من سوء تنفيذ', themes: { execution: 2 } },
      { label: 'الموهبة بتموت في صدور ناس', themes: { impact: 1, creating: 1 } },
      { label: 'فرص جديدة بتفوّت من غير ما حد يستغلها', themes: { building: 2 } },
    ],
  },
  {
    id: 's4',
    kind: 'choice',
    prompt: 'الناس بتيجي تطلب مساعدتك في إيه عادةً؟',
    options: [
      { label: 'أحللهم موقف معقّد', themes: { mastery: 2 } },
      { label: 'أصمم/أكتب لهم حاجة', themes: { creating: 2 } },
      { label: 'أنظّمهم وأطلّع نتيجة', themes: { execution: 2 } },
      { label: 'أحفّزهم أو أوجّههم', themes: { impact: 2 } },
    ],
  },
  {
    id: 's5',
    kind: 'choice',
    prompt: 'لو طلبت منك تختار شغل لـ 5 سنين بدون تغيير، الأهم عندك:',
    options: [
      { label: 'أتعلم وأكبر كل يوم', themes: { mastery: 2 } },
      { label: 'أعبّر عن أفكاري لجمهور', themes: { creating: 2 } },
      { label: 'أبني حاجة من الصفر', themes: { building: 2 } },
      { label: 'أشوف تأثيري في الناس', themes: { impact: 2 } },
    ],
  },
  {
    id: 's6',
    kind: 'choice',
    prompt: 'في وسط الزحام، أنت أحسن لما:',
    options: [
      { label: 'تتدخل بحلول عملية', themes: { execution: 1, building: 1 } },
      { label: 'تخلق لحظة فيها معنى', themes: { creating: 1, impact: 1 } },
      { label: 'تنظّم الناس وتقولهم يعملوا إيه', themes: { execution: 2 } },
      { label: 'تساعد اللي بيتأذى', themes: { impact: 2 } },
    ],
  },
  {
    id: 's7',
    kind: 'choice',
    prompt: 'بتحس بفخر حقيقي لما:',
    options: [
      { label: 'تنجز حاجة كبيرة في وقتها', themes: { execution: 2 } },
      { label: 'تصنع حاجة الناس بتحبها', themes: { creating: 1, building: 1 } },
      { label: 'تأثر في حياة حد', themes: { impact: 2 } },
      { label: 'تتقن مهارة عميقة', themes: { mastery: 2 } },
    ],
  },
  {
    id: 's8',
    kind: 'choice',
    prompt: 'لو شفت كتابين على الرف، تختار:',
    options: [
      { label: '"How to Build X" — كتاب تقني عملي', themes: { building: 2 } },
      { label: '"The Art of X" — كتاب إبداعي', themes: { creating: 2 } },
      { label: '"Mastering X" — كتاب تخصصي عميق', themes: { mastery: 2 } },
      { label: '"The Hidden Meaning of X" — كتاب فلسفي', themes: { impact: 1, mastery: 1 } },
    ],
  },
  {
    id: 's9',
    kind: 'choice',
    prompt: 'في الوقت اللي بتفكر فيه قبل النوم، أكتر حاجة بتدور في دماغك:',
    options: [
      { label: 'أفكار جديدة تجرّبها بكره', themes: { building: 2 } },
      { label: '"هل قلت/عملت كل الصح اليوم؟"', themes: { impact: 2 } },
      { label: '"إزاي أعمل X أحسن؟"', themes: { mastery: 2 } },
      { label: '"إيه اللي ممكن يطلع من الفكرة دي؟"', themes: { creating: 1, building: 1 } },
    ],
  },
  {
    id: 's10',
    kind: 'choice',
    prompt: 'لو قال لك حد "أنت شاطر في إيه؟" أول حاجة بتيجي في دماغك:',
    options: [
      { label: 'بفهم بسرعة وبربط النقط', themes: { mastery: 2 } },
      { label: 'بفك المشاكل وبصبر عليها', themes: { execution: 1, building: 1 } },
      { label: 'بحس بالناس وبفهمهم', themes: { impact: 2 } },
      { label: 'بدور على فرص وبجرّب', themes: { building: 1, creating: 1 } },
    ],
  },
  {
    id: 's11',
    kind: 'choice',
    prompt: 'بتزعل من نفسك أكتر لما:',
    options: [
      { label: 'ما حافظتش على روتيني', themes: { execution: 2 } },
      { label: 'ما تعلّمتش كفاية', themes: { mastery: 2 } },
      { label: 'ما أبدعتش حاجة', themes: { creating: 2 } },
      { label: 'ما ساعدتش حد محتاج', themes: { impact: 2 } },
    ],
  },
  {
    id: 's12',
    kind: 'choice',
    prompt: 'لو لقيت نفسك في جزيرة لوحدك لمدة شهر، هتعمل إيه أول حاجة:',
    options: [
      { label: 'أبني مأوى وأنظّم اللوجستيات', themes: { building: 2, execution: 1 } },
      { label: 'أكتب/أرسم اللي بحس بيه', themes: { creating: 2 } },
      { label: 'أتأمل وأفكر في حياتي', themes: { impact: 1, mastery: 1 } },
      { label: 'أتعلم حاجة جديدة من الطبيعة', themes: { mastery: 2 } },
    ],
  },
  // Optional reflection prompts — captured for the Phase 2 AI report.
  {
    id: 's13',
    kind: 'reflection',
    prompt: 'لو يوم واحد بقى لي، هعمل إيه؟ (اختياري)',
    placeholder: 'اكتب أول حاجة جت في بالك…',
  },
  {
    id: 's14',
    kind: 'reflection',
    prompt: 'إيه الحاجة اللي كنت بتعملها وأنت طفل وما زلت بتحبها؟ (اختياري)',
    placeholder: 'فكرة، نشاط، حلم، أي حاجة…',
  },
];
