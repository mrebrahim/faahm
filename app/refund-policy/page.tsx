import Link from 'next/link';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { CheckCircle2, ShieldCheck, RefreshCcw, Mail } from 'lucide-react';

export const metadata = {
  title: `سياسة الاسترجاع والإلغاء — ${APP_NAME}`,
  description:
    'ضمان استرداد 7 أيام بدون أسئلة، إلغاء التجديد التلقائي في أي وقت، وآلية واضحة لطلب الاسترجاع.',
};

/**
 * Public-facing refund + cancellation policy. Surfaces the
 * '7-day refund / cancel anytime' promise we make on /checkout into
 * a real, linkable document — Visa/Mastercard + PayPal expect the
 * policy to be visible to the cardholder before payment, and the
 * checkout's trust strip links here from the '🛡️ استرجاع 7 أيام'
 * pill.
 */
export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 sm:py-16">
      <main className="container mx-auto px-4 max-w-3xl">
        <div className="mb-6 text-xs text-gray-500">
          <Link href={ROUTES.home} className="hover:text-foreground">
            الرئيسية
          </Link>{' '}
          / سياسة الاسترجاع
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
          سياسة الاسترجاع والإلغاء
        </h1>
        <p className="text-gray-600 mb-8 text-sm">
          سياسة واضحة وبسيطة — بدون نص قانوني معقّد. هدفنا إنك تشترك وأنت
          مطمئن إن قرارك مش نهائي.
        </p>

        {/* Headline guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <ShieldCheck className="w-7 h-7 text-emerald-600 mb-2" />
            <h2 className="font-bold text-lg mb-1">ضمان استرداد 7 أيام</h2>
            <p className="text-sm text-emerald-900/80 leading-relaxed">
              لو غيّرت رأيك خلال أول 7 أيام من الاشتراك، نرجّع لك مبلغك
              بالكامل بدون أسئلة محرجة.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-5">
            <RefreshCcw className="w-7 h-7 text-brand-600 mb-2" />
            <h2 className="font-bold text-lg mb-1">إلغاء التجديد في أي وقت</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              تقدر توقف تجديد اشتراكك من لوحة حسابك بضغطة زرار. مفيش
              مكالمات ولا فورمات.
            </p>
          </div>
        </div>

        <Section title="١. مدة الضمان وكيفية طلب الاسترجاع">
          <ul className="space-y-2.5">
            <Bullet>
              مدة الضمان: <strong>7 أيام تقويمية</strong> من تاريخ خصم الاشتراك.
            </Bullet>
            <Bullet>
              طريقة الطلب: ابعت إيميل لـ{' '}
              <a
                href="mailto:support@faahm.com"
                className="text-brand-600 underline hover:no-underline"
                dir="ltr"
              >
                support@faahm.com
              </a>{' '}
              من نفس إيميل اشتراكك، وقل لنا "أرغب في استرداد قيمة الاشتراك".
            </Bullet>
            <Bullet>
              مدة المعالجة: نراجع طلبك خلال 48 ساعة عمل، ونبدأ الاسترداد
              بمجرد الموافقة.
            </Bullet>
            <Bullet>
              طريقة الرد: المبلغ يُرد على{' '}
              <strong>نفس وسيلة الدفع الأصلية</strong> (نفس البطاقة / حساب
              PayPal). البنك ممكن ياخد 5–10 أيام عمل عشان يعرض المبلغ في
              كشف حسابك.
            </Bullet>
          </ul>
        </Section>

        <Section title="٢. إيقاف التجديد التلقائي (الإلغاء)">
          <ul className="space-y-2.5">
            <Bullet>
              ادخل على <Link href={ROUTES.dashboard} className="text-brand-600 underline hover:no-underline">لوحتي</Link>{' '}
              → اضغط <strong>إدارة الاشتراك</strong> → اختار{' '}
              <strong>إيقاف التجديد التلقائي</strong>.
            </Bullet>
            <Bullet>
              بعد الإيقاف، يفضل اشتراكك شغّال لحد آخر يوم في المدة المدفوعة،
              ومش هتتخصم منك أي فلوس بعد كده.
            </Bullet>
            <Bullet>
              <strong>إيقاف التجديد ≠ استرجاع.</strong> الإلغاء بيوقف الفوترة
              القادمة، أما الاسترجاع بيرجّعلك الفلوس اللي اتخصمت بالفعل
              (متاح خلال أول 7 أيام بس).
            </Bullet>
          </ul>
        </Section>

        <Section title="٣. حالات الاستثناء">
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            ضمان الاسترداد بنطبّقه على كل اشتراك جديد بدون أسئلة. الحالات
            الوحيدة اللي ممكن نرفض فيها الاسترجاع:
          </p>
          <ul className="space-y-2.5">
            <Bullet>
              لو الحساب اتعمله بلاغ من إساءة استخدام (تحميل جماعي للمحتوى،
              مشاركة الحساب مع مستخدمين كتير، أو محاولة إعادة بيع المحتوى).
            </Bullet>
            <Bullet>
              لو فات على الاشتراك أكتر من 7 أيام. بعد المدة دي تقدر توقف
              التجديد بس مش يرجع المبلغ المدفوع.
            </Bullet>
          </ul>
        </Section>

        <Section title="٤. اسم الفاتورة في كشف الحساب">
          <p className="text-sm text-gray-700 leading-relaxed">
            هتلاقي اسم{' '}
            <code dir="ltr" className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              FAAHM
            </code>{' '}
            (أو <code dir="ltr" className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">FAAHM.COM</code>)
            في كشف بطاقتك. لو شفت اسم مختلف، تواصل معانا قبل ما تفتح نزاع
            بنكي — أسرع وأبسط لك.
          </p>
        </Section>

        <Section title="٥. لينا في إيه؟">
          <div className="flex items-start gap-3 rounded-xl bg-white border border-gray-200 p-4">
            <Mail className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm leading-relaxed">
              لأي سؤال عن الاسترجاع أو الإلغاء، تواصل معانا على{' '}
              <a
                href="mailto:support@faahm.com"
                className="text-brand-600 underline hover:no-underline"
                dir="ltr"
              >
                support@faahm.com
              </a>
              . بنردّ خلال 48 ساعة عمل، أغلب الوقت أسرع من كده.
            </div>
          </div>
        </Section>

        <p className="text-xs text-gray-400 mt-10 leading-relaxed">
          آخر تحديث: ٢٠٢٦/٠٦/٢٤. السياسة دي قابلة للتحديث في أي وقت،
          والإصدار اللي كان ساري وقت اشتراكك هو اللي ينطبق على اشتراكك.
        </p>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-xl font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
      <CheckCircle2 className="w-4 h-4 text-brand-500 mt-1 flex-shrink-0" />
      <div className="flex-1 min-w-0">{children}</div>
    </li>
  );
}
