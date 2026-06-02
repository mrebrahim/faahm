import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: `سياسة الخصوصية — ${APP_NAME}`,
  description: `كيف يجمع ويستخدم ${APP_NAME} بياناتك الشخصية.`,
};

export default function PrivacyPage() {
  const updated = '1 يونيو 2026';
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/help">تواصل معنا</Link>
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12 sm:py-16 max-w-3xl">
        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-500/10 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-brand-600" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
            سياسة الخصوصية
          </h1>
          <p className="text-sm text-gray-500">آخر تحديث: {updated}</p>
        </div>

        <article className="space-y-8 text-gray-700 leading-relaxed">
          <Section title="1. مقدمة">
            في {APP_NAME} بنحترم خصوصيتك. الصفحة دي بتشرح أنواع البيانات اللي
            بنجمعها، ليه بنجمعها، إزاي بنستخدمها، وحقوقك في التحكم فيها.
          </Section>

          <Section title="2. البيانات اللي بنجمعها">
            <h3 className="font-bold text-foreground mb-1.5">بيانات بتوفّرها أنت</h3>
            <ul className="list-disc ps-5 space-y-1.5 mb-4">
              <li>الإيميل والاسم الكامل (وقت التسجيل)</li>
              <li>رقم الموبايل والدولة (اختياري وقت التسجيل)</li>
              <li>كلمة السر (مخزّنة مشفّرة، ما بنشوفهاش)</li>
              <li>بيانات الدفع (بتروح مباشرة لـ Stripe — ما بنخزّنش بيانات
                  بطاقتك على سيرفراتنا)</li>
            </ul>

            <h3 className="font-bold text-foreground mb-1.5">بيانات بتتجمع تلقائياً</h3>
            <ul className="list-disc ps-5 space-y-1.5">
              <li>تقدّمك في الكورسات (الدروس المكتملة، المدة المشاهدة)</li>
              <li>سجل تسجيل الدخول والـ IP والمتصفح (لأغراض أمنية)</li>
              <li>كوكيز الجلسة (Session cookies) للحفاظ على تسجيل دخولك</li>
              <li>بيانات إحصائية مجمّعة عبر Google Analytics وMeta Pixel
                  وTikTok Pixel وMicrosoft Clarity</li>
            </ul>
          </Section>

          <Section title="3. ليه بنجمع البيانات دي؟">
            <ul className="list-disc ps-5 space-y-1.5">
              <li>تشغيل الحساب وتقديم الخدمة</li>
              <li>معالجة المدفوعات والاشتراكات</li>
              <li>إصدار شهادات الإتمام لما تخلص الكورس</li>
              <li>التواصل معاك بإشعارات وتحديثات (وأحياناً مواد ترويجية لو
                  وافقت)</li>
              <li>تحسين المنصة وفهم سلوك الاستخدام</li>
              <li>حماية الحساب ومنع الاحتيال</li>
            </ul>
          </Section>

          <Section title="4. مشاركة البيانات مع أطراف تالتة">
            ما بنبيعش بياناتك. بنشاركها فقط مع مزوّدي خدمة لتشغيل المنصة:
            <ul className="list-disc ps-5 space-y-1.5 mt-2">
              <li><strong>Supabase:</strong> تخزين الحسابات والبيانات</li>
              <li><strong>Stripe:</strong> معالجة المدفوعات</li>
              <li><strong>Bunny Stream:</strong> استضافة وبث الفيديوهات</li>
              <li><strong>Resend:</strong> إرسال الإيميلات (تأكيد الحساب،
                  إشعارات)</li>
              <li><strong>Google / Meta / TikTok / Clarity:</strong> تحليلات
                  وتسويق (بيانات مجمّعة بدون تعريفك شخصياً)</li>
            </ul>
            <p className="mt-3">
              كل الخدمات دي ملتزمة بسياسات حماية بيانات معتمدة دولياً (GDPR).
            </p>
          </Section>

          <Section title="5. الكوكيز">
            بنستخدم كوكيز ضرورية للحفاظ على جلستك بعد تسجيل الدخول، وكوكيز
            تحليلية لقياس استخدام الموقع. تقدر تعطّل الكوكيز من إعدادات
            متصفحك، بس بعض المزايا (زي تسجيل الدخول) مش هتشتغل.
          </Section>

          <Section title="6. حماية بياناتك">
            <ul className="list-disc ps-5 space-y-1.5">
              <li>الاتصال بالموقع مشفّر بالكامل عبر HTTPS</li>
              <li>كلمات السر مخزّنة مشفّرة (bcrypt)</li>
              <li>بيانات الدفع ما بتلمسش سيرفراتنا أصلاً</li>
              <li>سجل تدقيق على كل الإجراءات الإدارية</li>
              <li>الفيديوهات محميّة بـ token authentication وعليها watermark
                  بإيميلك لتتبّع التسريب</li>
            </ul>
          </Section>

          <Section title="7. حقوقك">
            تقدر في أي وقت:
            <ul className="list-disc ps-5 space-y-1.5 mt-2">
              <li>تشوف البيانات اللي عندنا عنك</li>
              <li>تطلب تعديل بياناتك</li>
              <li>تطلب حذف حسابك وكل بياناتك المرتبطة بيه</li>
              <li>تطلب نسخة من بياناتك (Data Export)</li>
              <li>تلغي الاشتراك في الرسائل التسويقية بضغطة زر</li>
            </ul>
            <p className="mt-3">
              لطلب أي من ده، ابعتلنا على{' '}
              <a
                href="mailto:info@faahm.com"
                className="text-brand-600 underline hover:no-underline"
              >
                info@faahm.com
              </a>
              .
            </p>
          </Section>

          <Section title="8. الأطفال">
            المنصة موجّهة للبالغين (18+). ما بنجمعش عن قصد بيانات من أطفال
            تحت 13 سنة. لو وصلتنا بيانات طفل بدون إذن ولي أمره، هنحذفها فوراً.
          </Section>

          <Section title="9. تحديثات على السياسة">
            ممكن نعدّل سياسة الخصوصية من وقت لآخر. هنبلّغك بأي تعديل جوهري
            عبر الإيميل قبل ما يدخل حيّز التنفيذ.
          </Section>

          <Section title="10. تواصل معنا">
            لأي استفسار عن خصوصيتك أو بياناتك:
            <br />
            <a
              href="mailto:info@faahm.com"
              className="text-brand-600 underline hover:no-underline"
            >
              info@faahm.com
            </a>{' '}
            • <Link href="/help" className="text-brand-600 underline hover:no-underline">مركز المساعدة</Link>
          </Section>
        </article>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold mb-3 text-foreground">{title}</h2>
      <div className="text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}
