import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: `أسئلة شائعة — ${APP_NAME}`,
  description: `إجابات لأكثر الأسئلة شيوعاً عن منصة ${APP_NAME}: الاشتراك، الدفع، الكورسات، الشهادات، والدعم.`,
};

const FAQS: Array<{ section: string; items: Array<{ q: string; a: React.ReactNode }> }> = [
  {
    section: 'الاشتراك والوصول',
    items: [
      {
        q: 'ازاي أبدأ مع فاهم؟',
        a: (
          <>
            ابدأ من{' '}
            <Link href="/personal-plan" className="text-brand-600 underline hover:no-underline">
              صفحة "احصل على خطتك الشخصية"
            </Link>
            ، اختار الباقة، ادفع — وحسابك بيتعمل تلقائياً بعد الدفع. كمان تقدر تشوف{' '}
            <Link href={ROUTES.pricing} className="text-brand-600 underline hover:no-underline">
              صفحة الأسعار
            </Link>
            ، وابدأ في تصفّح الكورسات فوراً.
          </>
        ),
      },
      {
        q: 'هل أقدر أشاهد محتوى مجاناً قبل الاشتراك؟',
        a: 'أيوه. كل كورس فيه دروس مجانية كـ free preview تقدر تشاهدها بدون اشتراك عشان تتأكد إن الكورس ليك.',
      },
      {
        q: 'الاشتراك بيدّيني وصول لكل الكورسات؟',
        a: 'أيوه — اشتراك واحد بيفتحلك كل الكورسات على المنصة. مفيش كورس بيتباع لوحده.',
      },
      {
        q: 'هل في فرق بين الاشتراك الشهري والسنوي؟',
        a: 'آه فيه فرق كبير. الشهري بـ $10/شهر وفيه الكورسات بس. السنوي بـ $40/سنة (وفّر 67% مقابل الدفع الشهري) وفيه كل حاجة: الكورسات + المساعد الذكي فاهم + شهادة الإتمام + أولوية الدعم الفني.',
      },
    ],
  },
  {
    section: 'الدفع والاسترداد',
    items: [
      {
        q: 'إيه طرق الدفع المتاحة؟',
        a: 'بنقبل كل البطاقات الائتمانية (Visa, Mastercard, AmEx) عبر Stripe. الدفع مشفّر وآمن 100%.',
      },
      {
        q: 'الأسعار بأي عملة؟',
        a: 'الأسعار بالدولار الأمريكي ($10 شهرياً / $40 سنوياً). للعملاء في مصر، فيه طرق دفع محلية بالجنيه (500 ج.م شهري / 2000 ج.م سنوي) عبر InstaPay أو Vodafone Cash.',
      },
      {
        q: 'ينفع أرجّع فلوسي لو الكورسات مش لاقية معايا؟',
        a: (
          <>
            عندنا ضمان استرداد كامل خلال أول 7 أيام من الاشتراك. التفاصيل في{' '}
            <Link href="/refund" className="text-brand-600 underline hover:no-underline">
              سياسة الاسترداد
            </Link>
            .
          </>
        ),
      },
      {
        q: 'هل أقدر ألغي الاشتراك في أي وقت؟',
        a: (
          <>
            أكيد. من{' '}
            <Link href={ROUTES.settings} className="text-brand-600 underline hover:no-underline">
              الإعدادات
            </Link>{' '}
            تقدر تلغي التجديد التلقائي بضغطة زر. هتفضل تقدر تشاهد لحد آخر
            الفترة المدفوعة.
          </>
        ),
      },
    ],
  },
  {
    section: 'الكورسات والمحتوى',
    items: [
      {
        q: 'الكورسات بتتجدّد إزاي؟',
        a: 'بنضيف كورسات جديدة باستمرار وبنحدّث القديمة لما الأدوات تتطوّر (n8n, ChatGPT, AI Video tools). كل اشتراك بيشمل المحتوى الجديد بدون أي رسوم إضافية.',
      },
      {
        q: 'أقدر أنزّل الفيديوهات وأشوفها أوفلاين؟',
        a: 'لا، الفيديوهات بتتعرض عبر streaming فقط لحماية حقوق المحتوى. لكن الـ workflows والـ prompts والملفات المرفقة قابلة للتحميل.',
      },
      {
        q: 'الفيديوهات بأي جودة؟',
        a: 'كل فيديو بيتعرض بـ HD (720p) مع تكييف تلقائي لجودة الإنترنت بتاعتك. لو الإنترنت ضعيف، الجودة بتنزل تلقائياً عشان ميقطعش.',
      },
      {
        q: 'في كويزات أو اختبارات؟',
        a: 'أيوه. كل كورس فيه كويزات مرتبطة بالدروس، وفي بعض الكويزات إجبارية للحصول على شهادة الإتمام.',
      },
    ],
  },
  {
    section: 'الشهادات',
    items: [
      {
        q: 'بتقدّموا شهادات إتمام؟',
        a: 'أيوه. لما تخلّص كل دروس الكورس وتعدّي الكويزات الإجبارية، بنصدر لك شهادة إتمام رسمية بإسمك تقدر تحمّلها أو تشاركها على لينكدإن.',
      },
      {
        q: 'الشهادات معتمدة؟',
        a: 'الشهادات صادرة من منصة فاهم! ومش معتمدة من جهة حكومية. الهدف منها إثبات إكمالك للكورس وعرضه على شبكاتك المهنية.',
      },
    ],
  },
  {
    section: 'الحساب والأمان',
    items: [
      {
        q: 'هل أقدر أشارك حسابي مع حد تاني؟',
        a: 'لا. كل حساب لشخص واحد. الفيديوهات عليها watermark بإيميلك لتتبّع أي تسريب، وأي مشاركة بتؤدي لإيقاف الحساب بدون استرداد.',
      },
      {
        q: 'نسيت كلمة السر، أعمل إيه؟',
        a: (
          <>
            ادخل على{' '}
            <Link
              href="/login/password"
              className="text-brand-600 underline hover:no-underline"
            >
              صفحة الدخول
            </Link>{' '}
            ودوس على "نسيت كلمة السر؟". هيوصلك لينك على الإيميل خلال دقايق.
          </>
        ),
      },
      {
        q: 'بياناتي آمنة؟',
        a: (
          <>
            أكيد. كل الاتصالات مشفّرة بـ HTTPS، وكلمات السر مخزّنة مشفّرة،
            وبيانات الدفع ما بتلمسش سيرفراتنا أصلاً. التفاصيل في{' '}
            <Link href="/privacy" className="text-brand-600 underline hover:no-underline">
              سياسة الخصوصية
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    section: 'الدعم الفني',
    items: [
      {
        q: 'إزاي أتواصل مع الدعم؟',
        a: (
          <>
            عبر الإيميل{' '}
            <a
              href="mailto:info@faahm.com"
              className="text-brand-600 underline hover:no-underline"
            >
              info@faahm.com
            </a>{' '}
            أو واتساب{' '}
            <a
              href="https://wa.me/201027555789"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 underline hover:no-underline"
              dir="ltr"
            >
              +20 102 755 5789
            </a>
            . الردّ خلال 24 ساعة عمل.
          </>
        ),
      },
      {
        q: 'الفيديو مش بيشتغل، أعمل إيه؟',
        a: 'أول حاجة: حدّث الصفحة (Ctrl/Cmd + R). لو لسه فيه مشكلة، جرّبها في متصفح تاني. لو المشكلة استمرّت، ابعتلنا إيميل بصورة من الشاشة ورابط الدرس.',
      },
    ],
  },
];

export default function FaqPage() {
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
        <div className="text-center mb-12">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-500/10 flex items-center justify-center">
            <HelpCircle className="w-7 h-7 text-brand-600" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-3">
            أسئلة شائعة
          </h1>
          <p className="text-gray-600 leading-relaxed">
            كل اللي عاوز تعرفه عن فاهم في مكان واحد. ما لقيتش سؤالك؟{' '}
            <Link href="/help" className="text-brand-600 underline hover:no-underline">
              ابعتلنا
            </Link>
            .
          </p>
        </div>

        <div className="space-y-10">
          {FAQS.map((section) => (
            <div key={section.section}>
              <h2 className="font-display text-xl font-bold mb-4 text-brand-700">
                {section.section}
              </h2>
              <div className="space-y-3">
                {section.items.map((item, i) => (
                  <details
                    key={i}
                    className="group rounded-xl border border-gray-200 bg-white p-5 open:border-brand-500/30 open:bg-brand-500/5 transition-colors"
                  >
                    <summary className="cursor-pointer font-bold list-none flex items-start justify-between gap-3">
                      <span>{item.q}</span>
                      <span className="text-brand-500 text-xl flex-shrink-0 transition-transform group-open:rotate-45 leading-none">
                        +
                      </span>
                    </summary>
                    <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <p className="text-sm text-gray-500 mb-4">
            عندك سؤال مش موجود هنا؟ فريق الدعم هيرد عليك خلال 24 ساعة.
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
