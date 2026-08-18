import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { Mail, MessageCircle, Clock, HelpCircle, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: `مركز المساعدة — ${APP_NAME}`,
  description: `تواصل مع فريق دعم ${APP_NAME} عبر الإيميل أو واتساب. ردنا خلال 24 ساعة عمل.`,
};

const SUPPORT_EMAIL = 'info@faahm.com';
const SUPPORT_PHONE_INTL = '201027555789';
const SUPPORT_PHONE_DISPLAY = '+20 102 755 5789';

export default function HelpPage() {
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
            <Link href={ROUTES.courses}>تصفّح الكورسات</Link>
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12 sm:py-16 max-w-3xl">
        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-500/10 flex items-center justify-center">
            <HelpCircle className="w-7 h-7 text-brand-600" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-3">
            إزاي نقدر نساعدك؟
          </h1>
          <p className="text-gray-600 leading-relaxed">
            فريق الدعم بتاعنا متاح للرد على أي استفسار — سواء عن الكورسات،
            الاشتراك، الدفع، أو أي مشكلة تقنية. اختار الطريقة اللي تريحك.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <ContactCard
            icon={Mail}
            title="البريد الإلكتروني"
            subtitle="الأفضل للأسئلة التفصيلية"
            value={SUPPORT_EMAIL}
            href={`mailto:${SUPPORT_EMAIL}`}
            cta="ابعت إيميل"
            dir="ltr"
          />
          <ContactCard
            icon={MessageCircle}
            title="واتساب"
            subtitle="الأسرع للاستفسارات السريعة"
            value={SUPPORT_PHONE_DISPLAY}
            href={`https://wa.me/${SUPPORT_PHONE_INTL}?text=${encodeURIComponent(
              'اريد الاستفسار عن كورسات الذكاء الاصطناعي'
            )}`}
            cta="افتح واتساب"
            dir="ltr"
            external
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8 mb-10">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-brand-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-display text-lg font-bold mb-2">أوقات الرد</h2>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li>• <strong>الإيميل:</strong> خلال 24 ساعة عمل</li>
                <li>• <strong>واتساب:</strong> خلال 2-4 ساعات في أيام العمل</li>
                <li>• <strong>أيام العمل:</strong> الأحد لـ الخميس، 10ص – 2م (توقيت القاهرة)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold mb-5">أسئلة شائعة</h2>
          <div className="space-y-5">
            <Faq q="ازاي أشترك في فاهم؟">
              ادخل على <Link href={ROUTES.pricing} className="text-brand-600 underline hover:no-underline">صفحة الأسعار</Link>،
              اختار الخطة المناسبة، وكمل الدفع بأمان عبر Stripe.
              الوصول بيتفعّل فور تأكيد الدفع — الباقة السنوية بتفتح كل الكورسات،
              والشهرية بتفتح معظمها.
            </Faq>
            <Faq q="هل أقدر ألغي الاشتراك في أي وقت؟">
              أكيد. من <Link href={ROUTES.settings} className="text-brand-600 underline hover:no-underline">الإعدادات</Link> تقدر
              تلغي الاشتراك بضغطة زر، وهيفضل شغّال لحد آخر الفترة المدفوعة
              من غير ما يتجدّد.
            </Faq>
            <Faq q="ينفع أرجّع فلوسي لو الكورسات مش لاقية معايا؟">
              أيوه. عندنا ضمان استرداد كامل خلال أول 7 أيام من الاشتراك.
              التفاصيل في <Link href="/refund" className="text-brand-600 underline hover:no-underline">سياسة الاسترداد</Link>.
            </Faq>
            <Faq q="نسيت كلمة السر، أعمل إيه؟">
              ادخل على <Link href="/login/password" className="text-brand-600 underline hover:no-underline">صفحة الدخول بكلمة السر</Link> ودوس
              على "نسيت كلمة السر؟". هيوصلك لينك على الإيميل لإعادة التعيين.
            </Faq>
            <Faq q="الفيديو مش بيشتغل، أعمل إيه؟">
              جرّب أول حاجة: تحديث الصفحة (Ctrl + R أو Cmd + R)، أو افتحها
              في متصفح تاني. لو لسه فيه مشكلة، ابعتلنا إيميل بصورة من الشاشة
              ورابط الدرس وهنحلّها فورًا.
            </Faq>
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-gray-500 mb-4">
            ما لقيتش إجابتك؟ تواصل معنا مباشرة.
          </p>
          <Button asChild>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              ابعتلنا إيميل
              <ArrowLeft className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  title,
  subtitle,
  value,
  href,
  cta,
  dir,
  external = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  value: string;
  href: string;
  cta: string;
  dir?: 'ltr' | 'rtl';
  external?: boolean;
}) {
  const linkProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' as const }
    : {};
  return (
    <a
      href={href}
      {...linkProps}
      className="group rounded-2xl border border-gray-200 bg-white p-5 hover:border-brand-500/40 hover:bg-brand-500/5 transition-colors block"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-brand-600" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div
        className="font-mono text-sm text-foreground mb-3 break-all"
        dir={dir ?? 'ltr'}
      >
        {value}
      </div>
      <span className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium group-hover:gap-2 transition-all">
        {cta}
        <ArrowLeft className="w-4 h-4" />
      </span>
    </a>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold mb-1.5">{q}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}
