import { CANONICAL_URL } from '@/lib/constants';

/**
 * /llms.txt — a short, plain-text map of the site for AI assistants
 * (llmstxt.org). Prices are deliberately left out: they live on the
 * pricing page and change with offers, so we point there instead.
 */
export const revalidate = 86400;

export function GET() {
  const body = `# فاهم (Faahm)

> منصة عربية لتعليم أدوات الذكاء الاصطناعي والأوتوميشن بالعامية المصرية، من إبراهيم خليل. كورسات عملية بمشاريع: n8n للأوتوميشن، صناعة الفيديو بالذكاء الاصطناعي (AI Video)، وبرمجة المواقع والتطبيقات بالذكاء الاصطناعي (Vibe Coding).

## الكورسات
- [كل الكورسات](${CANONICAL_URL}/courses): قايمة الكورسات المنشورة وتفاصيل كل كورس
- [باقة الذكاء الاصطناعي](${CANONICAL_URL}/ai-bundle): الكورسات التلاتة مع بعض
- [الأسعار والاشتراكات](${CANONICAL_URL}/pricing): الأسعار الحالية وطرق الدفع

## معلومات
- [أسئلة شائعة](${CANONICAL_URL}/faq): الشراء، الوصول، الشهادات، والدعم
- [عن فاهم](${CANONICAL_URL}/about)
- [المساعدة](${CANONICAL_URL}/help)
- [المدونة](${CANONICAL_URL}/blog)

## سياسات
- [الشروط](${CANONICAL_URL}/terms)
- [الخصوصية](${CANONICAL_URL}/privacy)
- [الاسترجاع](${CANONICAL_URL}/refund)
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
