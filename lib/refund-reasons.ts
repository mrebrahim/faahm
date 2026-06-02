/**
 * Canonical refund-reason list. Used by both the in-UI refund dialog and
 * the revenue dashboard's reason breakdown, so the same Arabic strings
 * roll up consistently when grouped.
 *
 * Storing the Arabic label as-is in refunds.reason keeps reporting
 * trivially groupable without a separate enum / lookup table.
 */
export const REFUND_REASONS: readonly string[] = [
  'محتوى ضعيف',
  'تعثر مالي',
  'قصور في الدعم الفني',
  'تأخر في الوصول للكورس',
  'مشكلة تقنية في الفيديوهات',
  'الكورس مش زي ما توقّعت',
  'دفعة مكرّرة بالغلط',
  'اشترك بالخطأ في الكورس',
  'استرداد تقديري من الإدارة',
];

export const REFUND_OTHER_LABEL = 'أخرى';
