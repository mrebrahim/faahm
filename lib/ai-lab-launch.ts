/**
 * Launch facts for the AI Lab landing page.
 *
 * Everything here appears on the page more than once. It lives in one
 * file so the cohort date can never say the 18th in the hero and the
 * 20th in the FAQ — which is exactly what happened to the draft this
 * replaces.
 */

/**
 * ⚠️ PLACEHOLDER — the real cohort start date has not been decided.
 *
 * Change this ONE constant and the hero badge, the top bar, the FAQ and
 * the closing section all follow. Do not hard-code a date anywhere else
 * on the page.
 */
export const COHORT_START_ISO = '2026-10-18';

/** Cairo-time day/month, e.g. "١٨ أكتوبر". */
export function cohortStartLabel(): string {
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Cairo',
  }).format(new Date(`${COHORT_START_ISO}T00:00:00+02:00`));
}

/** Whole days until the cohort opens. Negative once it has started. */
export function daysUntilCohort(now: Date = new Date()): number {
  const start = new Date(`${COHORT_START_ISO}T00:00:00+02:00`).getTime();
  return Math.ceil((start - now.getTime()) / 86_400_000);
}

/**
 * The single call to action, repeated verbatim wherever a button
 * appears. Four buttons with three different labels reads as three
 * different offers.
 */
export const CTA_LABEL = 'احجز مكانك في الدفعة';

/**
 * The twelve weeks, as content rather than markup — the page renders
 * this list, so adding a phase is a data edit.
 */
export const PHASES = [
  {
    weeks: '١–٤',
    title: 'أتمتة n8n',
    outcome: 'workflow شغال بيحل مشكلة حقيقية عندك',
    note: 'من غير كود — عشان تطلع بنتيجة قبل ما تفقد الحماس',
  },
  {
    weeks: '٥–٨',
    title: 'AI Video',
    outcome: 'فيديو أو ريلز منتج بالكامل بالـAI',
    note: 'المهارة اللي بتسوّق بيها أي حاجة هتعملها بعد كده',
  },
  {
    weeks: '٩–١٢',
    title: 'Vibe Coding',
    outcome: 'tool أو SaaS صغير شغال',
    note: 'آخر واحد لأنه الأصعب — وساعتها هتكون اتعودت على الإيقاع',
  },
] as const;

/**
 * Objection-first FAQ. The hardest question is deliberately number
 * one: burying it under "إيه هو AI Lab؟" means the person who has it
 * leaves before they reach the answer.
 */
export const FAQS = [
  {
    q: 'أنا شاري الكورسات خلاص — ليه أدفع تاني؟',
    a: 'إنت مش بتدفع على المحتوى. المحتوى معاك بالفعل وهيفضل معاك سواء دخلت AI Lab أو لأ. بتدفع على اللي منعك تخلّصه: جدول أسبوعي بتاريخ، ديدلاين لكل مشروع، وحد بيفتح شغلك ويقولك غلط فين. لو إنت من النوع اللي بيخلّص لوحده، متدفعش.',
  },
  {
    q: 'مش هعرف ألتزم — زي كل مرة',
    a: 'ده السبب اللي البرنامج موجود عشانه. الجدول والديدلاين مش إضافة على المحتوى — دول المنتج نفسه. فيه تاريخ بداية، module كل أسبوع، ولايف أسبوعي بتيجي فيه ومعاك سؤال. اللي مبيسلّمش بيتسأل، مش بيتساب.',
  },
  {
    q: 'معنديش خلفية برمجة',
    a: 'الترتيب متعمد عشان كده. بتبدأ بـn8n وهو من غير كود خالص، وVibe Coding آخر حاجة بعد ٨ أسابيع اتعودت فيهم على الأدوات. مطلوب منك تعرف تستخدم كمبيوتر وبس.',
  },
  {
    q: 'مش هقدر أحضر اللايف في معاده',
    a: 'التسجيل بيبقى متاح خلال ٢٤ ساعة ومش بنقفله. وقبل كل جلسة بيوم فيه بوست تبعت فيه سؤالك، وبيتقال باسمك على الهوا حتى لو مش موجود.',
  },
  {
    q: 'هيتخصم مني تاني؟',
    a: 'أيوه — دي عضوية في برنامج مستمر فبتتجدد حسب الباقة اللي اخترتها. تقدر توقف التجديد في أي وقت من الإعدادات وتفضل عضو لحد آخر يوم دفعت فيه. والكورسات اللي اشتريتها منفصلة تماماً وبتفضل معاك للأبد.',
  },
  {
    q: 'لو مش عاجبني؟',
    a: 'استرداد كامل خلال ٧ أيام من غير أسئلة. احضر أول لايف، وشوف الجدول، ولو حسّيت إنها مش ليك كلّمنا على واتساب وبنرجّعلك المبلغ.',
  },
  {
    q: 'أنا مش شاري أي كورس أصلاً — ينفع أدخل؟',
    a: 'أيوه. العضوية بتفتحلك محتوى المسار طول مدتها. ولو حبيت الكورسات تفضل معاك للأبد بعد كده، تقدر تشتريها منفصلة في أي وقت.',
  },
  {
    q: 'إزاي بدفع من مصر؟',
    a: 'InstaPay أو Vodafone Cash بالجنيه. بتحوّل، بتبعت صورة التحويل على واتساب، وبنفعّل حسابك خلال ٢٤ ساعة كحد أقصى.',
  },
] as const;
