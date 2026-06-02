import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { FileText } from 'lucide-react';

export const metadata = {
  title: `شروط الاستخدام — ${APP_NAME}`,
  description: `شروط استخدام منصة ${APP_NAME} للتعلّم.`,
};

export default function TermsPage() {
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
            <FileText className="w-7 h-7 text-brand-600" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
            شروط الاستخدام
          </h1>
          <p className="text-sm text-gray-500">آخر تحديث: {updated}</p>
        </div>

        <article className="prose-content space-y-8 text-gray-700 leading-relaxed">
          <Section title="1. القبول بالشروط">
            باستخدامك لمنصة {APP_NAME}، أنت توافق على شروط الاستخدام دي وعلى
            سياسة الخصوصية. لو مش موافق على أي بند، يُرجى عدم استخدام المنصة.
          </Section>

          <Section title="2. الحساب وكلمة السر">
            <ul className="list-disc ps-5 space-y-1.5">
              <li>أنت مسؤول عن سرية بيانات حسابك (الإيميل وكلمة السر).</li>
              <li>ممنوع مشاركة الحساب أو السماح لأي شخص تاني باستخدامه.</li>
              <li>لو رصدنا مشاركة حساب أو سلوك مريب، حقّنا نوقف الحساب فوراً
                  بدون استرداد.</li>
            </ul>
          </Section>

          <Section title="3. الاشتراك والدفع">
            <ul className="list-disc ps-5 space-y-1.5">
              <li>الاشتراك بيتجدّد تلقائياً في نهاية كل فترة (شهري أو سنوي).</li>
              <li>تقدر تلغي التجديد التلقائي في أي وقت من إعدادات حسابك.</li>
              <li>الأسعار معروضة بالدولار الأمريكي، وممكن تتغيّر بإشعار مسبق.</li>
              <li>الدفع آمن عبر Stripe ونحن لا نخزّن بيانات بطاقتك على
                  سيرفراتنا.</li>
            </ul>
          </Section>

          <Section title="4. الاسترداد">
            بنوفّر ضمان استرداد كامل خلال أول 7 أيام من الاشتراك. التفاصيل
            الكاملة في{' '}
            <Link href="/refund" className="text-brand-600 underline hover:no-underline">
              سياسة الاسترداد
            </Link>.
          </Section>

          <Section title="5. الملكية الفكرية">
            <ul className="list-disc ps-5 space-y-1.5">
              <li>كل المحتوى (فيديوهات، نصوص، ملفات، Workflows، Prompts) ملك
                  لـ {APP_NAME} أو لأصحابه ومرخّص لنا.</li>
              <li>الاشتراك بيدّيك حق المشاهدة والاستخدام الشخصي فقط — مش
                  حق إعادة النشر أو البيع أو المشاركة.</li>
              <li>إعادة رفع المحتوى على يوتيوب أو تيليجرام أو أي منصة بيعتبر
                  انتهاك جسيم بيؤدي لإيقاف الحساب والمحاسبة القانونية.</li>
            </ul>
          </Section>

          <Section title="6. السلوك المقبول">
            <p className="mb-2">باستخدامك للمنصة، أنت توافق على إنك:</p>
            <ul className="list-disc ps-5 space-y-1.5">
              <li>ما تحاولش تتسلل لحسابات تانية أو تخترق أنظمتنا.</li>
              <li>ما تستخدمش المنصة في أي نشاط غير قانوني.</li>
              <li>ما تنزّلش أو تسجّلش الفيديوهات بأي طريقة (الـ watermark
                  على الفيديوهات ده يربطها بحسابك لأغراض تتبّع التسريب).</li>
              <li>ما تستخدمش bots أو أدوات أوتوماتيك للوصول للمحتوى.</li>
            </ul>
          </Section>

          <Section title="7. إيقاف الحساب">
            بنحتفظ بحقنا في إيقاف أو حذف أي حساب يخالف هذه الشروط، بدون إشعار
            مسبق، وبدون استرداد للأموال في حالات الانتهاك الجسيم (تسريب محتوى،
            احتيال في الدفع، إساءة استخدام).
          </Section>

          <Section title="8. إخلاء المسؤولية">
            المحتوى التعليمي بيتقدّم "كما هو" بهدف التعلّم. مش بنضمن نتائج
            مالية أو وظيفية معيّنة من تطبيق ما بيتقدّم في الكورسات — النتائج
            بتعتمد على مجهودك وتطبيقك.
          </Section>

          <Section title="9. التعديل على الشروط">
            ممكن نعدّل هذه الشروط من وقت لآخر. هنبلّغك بأي تعديل جوهري عبر
            الإيميل أو إشعار داخل المنصة. الاستمرار في الاستخدام بعد التعديل
            بيعتبر قبول للشروط الجديدة.
          </Section>

          <Section title="10. القانون المعمول به">
            تخضع هذه الشروط لقوانين جمهورية مصر العربية. أي نزاع ينشأ عنها
            بيتم الفصل فيه أمام المحاكم المصرية المختصة.
          </Section>

          <Section title="11. التواصل">
            لأي استفسار عن هذه الشروط، تواصل معنا على{' '}
            <a
              href="mailto:info@faahm.com"
              className="text-brand-600 underline hover:no-underline"
            >
              info@faahm.com
            </a>{' '}
            أو من خلال{' '}
            <Link href="/help" className="text-brand-600 underline hover:no-underline">
              مركز المساعدة
            </Link>.
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
