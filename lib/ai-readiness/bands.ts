import type { BandId } from './types';

export type Band = {
  id: BandId;
  name_ar: string;
  tagline_ar: string;
  description_ar: string;
  emoji: string;
  colorClass: string;
  range: [number, number];
  /** Words for the result card — frames as opportunity per PRD. */
  catch_up_plan_intro: string;
};

export const BANDS: Band[] = [
  {
    id: 'high_exposure',
    name_ar: 'معرّض بشدة — فرصتك أكبر مما تظن',
    tagline_ar: 'شغلك ممكن يتأتمت، بس ده يعني فرصة تقفز قبل الموجة',
    description_ar:
      'مهاراتك الحالية في AI لسه في أول الطريق، وشغلك فيه نسبة كبيرة ممكن تتعمل بأداة. الجانب الإيجابي: لو بدأت دلوقتي، تقدر تبقى من اللي بيستخدم الـ AI بدل ما يكون الـ AI بيستخدمك.',
    emoji: '🚨',
    colorClass: 'from-rose-500 to-red-700',
    range: [0, 39],
    catch_up_plan_intro:
      'الخطة دي مصممة عشان تبدأ بسرعة، تبني أساس قوي في 30 يوم، وتحوّل التهديد لفرصة:',
  },
  {
    id: 'safe',
    name_ar: 'آمن نسبياً — في الطريق الصح',
    tagline_ar: 'عندك أساس، باقي شوية عشان تطلع للأمام',
    description_ar:
      'بتستخدم AI بشكل معقول وعندك بعض المهارات، بس لسه فيه مساحة كبيرة تتطور. الـ AI مش تهديد ليك دلوقتي، بس مش هتفضل آمن لو ما طوّرتش مهاراتك.',
    emoji: '🛡️',
    colorClass: 'from-amber-500 to-orange-600',
    range: [40, 69],
    catch_up_plan_intro:
      'عندك أساس كويس — الخطوة الجاية تخصصك في مجال محدد بتحوّلك من مستخدم عادي لـ pro:',
  },
  {
    id: 'ahead',
    name_ar: 'سابق السوق — مكانك في الـ top 10%',
    tagline_ar: 'بتقود الموجة، مش بتتجرّ ورا',
    description_ar:
      'مهاراتك وعاداتك في AI أعلى من 90% من السوق. شغلك صعب يتأتمت، وأنت بتستخدم الـ AI كـ amplifier مش بديل. الخطوة الجاية: عمق أكتر في تخصص بيدّيك ميزة لا يقدر يقلّدها.',
    emoji: '🚀',
    colorClass: 'from-emerald-500 to-teal-700',
    range: [70, 100],
    catch_up_plan_intro:
      'عشان تحافظ على مكانك في الـ top، الكورسات دي بتدّيك عمق تخصصي:',
  },
];

const BAND_BY_ID = new Map(BANDS.map((b) => [b.id, b]));

export function getBand(id: BandId): Band {
  return BAND_BY_ID.get(id) ?? BANDS[1];
}
