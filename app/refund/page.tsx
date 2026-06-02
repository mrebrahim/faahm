import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { ShieldCheck, Clock, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: `سياسة الاسترداد — ${APP_NAME}`,
  description: `سياسة الاسترداد في ${APP_NAME}: استرداد كامل خلال 7 أيام من تاريخ الاشتراك، من غير أسئلة.`,
};

export default function RefundPage() {
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
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-3">
            ضمان استرداد خلال 7 أيام
          </h1>
          <p className="text-gray-600 leading-relaxed">
            بنثق في المحتوى اللي بنقدّمه. لو الكورسات مش لاقية معاك لأي سبب،
            تقدر تطلب استرداد كامل خلال أول 7 أيام من تاريخ الاشتراك بدون
            ما نسألك أسئلة.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-brand-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-display text-xl font-bold mb-2">
                المدة: 7 أيام من تاريخ الاشتراك
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                المهلة بتبدأ من اللحظة اللي تم فيها خصم أول دفعة. لو طلبت
                الاسترداد خلال السبع أيام، هنرجّع المبلغ كامل لنفس وسيلة الدفع
                اللي استخدمتها — عادةً خلال 5 إلى 10 أيام عمل (حسب البنك).
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <Card icon={CheckCircle2} tone="brand" title="بيشمل الاسترداد">
            <ul className="space-y-1.5 text-sm text-gray-600 list-disc ps-5">
              <li>الاشتراك الشهري الجديد</li>
              <li>الاشتراك السنوي الجديد</li>
              <li>أي طلب خلال أول 7 أيام</li>
            </ul>
          </Card>
          <Card icon={XCircle} tone="danger" title="ما ينطبقش الاسترداد على">
            <ul className="space-y-1.5 text-sm text-gray-600 list-disc ps-5">
              <li>الطلبات بعد 7 أيام من الاشتراك</li>
              <li>تجديد اشتراك سابق (تقدر تلغيه قبل التجديد)</li>
              <li>حسابات اتسجّلت بسوء استخدام أو خرق للشروط</li>
            </ul>
          </Card>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8 mb-10">
          <h2 className="font-display text-xl font-bold mb-4">ازاي تطلب الاسترداد؟</h2>
          <ol className="space-y-3 text-sm text-gray-700">
            <Step n="1">
              ابعتلنا إيميل على{' '}
              <a
                href="mailto:info@faahm.com?subject=طلب%20استرداد"
                className="text-brand-600 underline hover:no-underline"
              >
                info@faahm.com
              </a>{' '}
              أو راسلنا واتساب على{' '}
              <a
                href="https://wa.me/201027555789"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 underline hover:no-underline"
                dir="ltr"
              >
                +20 102 755 5789
              </a>
            </Step>
            <Step n="2">
              اكتب الإيميل المسجّل به حسابك + تاريخ الاشتراك (لو متذكره).
            </Step>
            <Step n="3">
              هنرد عليك خلال 24 ساعة عمل ونؤكد بدء الاسترداد. المبلغ بيرجع
              تلقائياً لنفس البطاقة/المحفظة اللي دفعت بيها.
            </Step>
          </ol>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">
            لسه عندك أسئلة؟ فريق الدعم هنا يساعدك.
          </p>
          <Button asChild>
            <Link href="/help">
              تواصل مع الدعم
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: 'brand' | 'danger';
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === 'brand'
      ? 'border-brand-500/20 bg-brand-500/5 text-brand-700'
      : 'border-red-200 bg-red-50 text-red-700';
  return (
    <div className={`rounded-2xl border p-5 ${toneClasses}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" />
        <h3 className="font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <div className="leading-relaxed pt-0.5">{children}</div>
    </li>
  );
}
