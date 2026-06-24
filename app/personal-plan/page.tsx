import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MainNav } from '@/components/main-nav';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { pricingFor } from '@/lib/region';
import { SARMoney } from '@/components/sar-money';
import { SocialProofToast } from '@/components/social-proof-toast';
import { CourseCarousel, type CarouselCourse } from '@/components/course-carousel';
import { StickyMobileCTA } from '@/components/sticky-mobile-cta';
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  XCircle,
  Sparkles,
  Bot,
  Languages,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const metadata = {
  title: `احصل على خطتك الشخصية — ${APP_NAME}`,
  description:
    'خطة تعلّم شخصية بالذكاء الاصطناعي — كورسات بالعربي + المساعد الذكي فاهم يجاوبك في أي درس. اشتراك واحد بسيط.',
};

export const dynamic = 'force-dynamic';

/**
 * Landing page for the 'احصل على خطتك الشخصية' CTA from the home page
 * and ad funnels. Conversion-focused single-page funnel that ends at
 * the pricing cards — no menu, no footer links inside the body, every
 * scroll lands on a stronger reason to subscribe than the last.
 *
 * Hero promise → AI assistant USP → problem/solution → comparison vs
 * buying a single course outside → pricing (SAR) → FAQ → final CTA.
 */
export default async function PersonalPlanPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pull the full catalog up front. The three flagship AI courses
  // (n8n, vibe-coding, ai-video) get their own highlighted carousel
  // above the fold's AI-assistant story; everything else cascades
  // into the secondary 'باقي الكورسات' rail.
  const { data: allCourses } = await supabase
    .from('courses')
    .select(
      'id, slug, title_ar, thumbnail_url, total_lessons, total_duration_sec, rating_avg, rating_count, sort_order'
    )
    .eq('is_published', true)
    .order('sort_order')
    .order('created_at', { ascending: false });

  const FEATURED_SLUGS = ['n8n', 'vibe-coding', 'ai-video'];
  const courses = (allCourses ?? []) as CarouselCourse[];
  const featuredCourses = FEATURED_SLUGS
    .map((slug) => courses.find((c) => c.slug === slug))
    .filter((c): c is CarouselCourse => !!c);
  const restCourses = courses.filter((c) => !FEATURED_SLUGS.includes(c.slug));
  const totalCourses = courses.length || 21;

  const p = pricingFor('sa');

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <SocialProofToast />
      <StickyMobileCTA />
      <MainNav signedIn={!!user} isAdmin={false} />

      {/* ─────────────────────────  HERO  ───────────────────────── */}
      <section className="relative px-4 pt-12 sm:pt-20 pb-16 sm:pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-brand-500/5 blur-[120px]"
        />
        <div className="relative container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-brand-500/30 bg-brand-500/10">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-brand-700">
              خطّتك الشخصية في الذكاء الاصطناعي
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-5">
            ابدأ خطتك الشخصية في الـ AI —{' '}
            <span className="text-gradient-brand">بالعربي</span>،<br className="hidden sm:inline" />{' '}
            ومعاك فاهم يجاوبك.
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 mb-8 leading-relaxed">
            كورسات مصمّمة بالذكاء الاصطناعي في الأتمتة، التسويق الرقمي،
            صناعة المحتوى، والبرمجة — من خبراء عرب وباشتراك واحد بسيط بالريال.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-6">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto sm:min-w-[220px] font-bold min-h-[52px]"
            >
              <Link href="#pricing">
                ابدأ خطتك الشخصية
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto sm:min-w-[180px] min-h-[52px]"
            >
              <Link href={ROUTES.courses}>تصفّح الكورسات</Link>
            </Button>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            ضمان استرداد 7 أيام · إلغاء التجديد في أي وقت
          </div>
        </div>
      </section>

      {/* ─────────────────────────  STATS BAR  ─────────────────────────
          Mobile spec: 2×2 grid, large bold value, small label under.
          One horizontal row above tablet so the stats don't dominate
          the fold on a big screen. */}
      <section className="relative px-4 py-10 sm:py-12 border-t border-gray-100 bg-gray-50">
        <div className="container mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 text-center">
          <Stat value="عالمية" label="كورسات مترجمة بالعربي" />
          <Stat value="24/7" label="المساعد الذكي بيرد عليك" />
          <Stat value="٤.٨ ⭐" label="متوسط تقييمات الطلاب" />
          <Stat value="7 أيام" label="ضمان استرداد بدون أسئلة" />
        </div>
      </section>

      {/* ─────────────────────  AI ASSISTANT USP  ─────────────────── */}
      <section className="relative px-4 py-16 sm:py-20 border-t border-gray-100">
        <div className="container mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full border border-brand-500/30 bg-brand-500/10 text-xs font-bold text-brand-700">
              <Bot className="w-3.5 h-3.5" /> الميزة اللي مفيش عند حد تاني
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold mb-4 leading-tight">
              مش هتتعلّم لوحدك — <span className="text-gradient-brand">فاهم</span>{' '}
              معاك في كل درس.
            </h2>
            <p className="text-gray-600 leading-relaxed mb-5 text-sm sm:text-base">
              مساعد ذكي مدرّب على محتوى كل كورس بالعربي. تسأل أي سؤال جوّه
              الدرس — تشرح، تلخّص، تترجم، تختبرك — والإجابة بتيجي من قلب
              الكورس مش من جوجل.
            </p>
            <ul className="space-y-3">
              <BulletIcon icon={Languages} text="بالعربي الفصيح والعامية — مش بتترجم، بيشرح من الأول." />
              <BulletIcon icon={Bot} text="مدرّب على محتوى الدرس اللي بتتفرّج عليه — مفيش 'مش عارف'." />
              <BulletIcon icon={Zap} text="رد فوري 24/7 من غير ما تستنّى مدرّس." />
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <AssistantMockup />
          </div>
        </div>
        <div className="container mx-auto max-w-5xl mt-8 sm:mt-10">
          <MidCTA />
        </div>
      </section>

      {/* ─────────────────────  FEATURED AI COURSES  ───────────────── */}
      {featuredCourses.length > 0 && (
        <section className="relative px-4 py-14 sm:py-16 border-t border-gray-100">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 sm:mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full border border-brand-500/30 bg-brand-500/10 text-[11px] font-bold text-brand-700">
                  <Bot className="w-3.5 h-3.5" />
                  كورسات AI الأكثر طلباً
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold">
                  ابدأ من أقوى كورسات الذكاء الاصطناعي عندنا
                </h2>
                <p className="text-gray-600 text-sm mt-2 max-w-2xl">
                  ٣ كورسات بتاخدك من الصفر للاحتراف في الأتمتة، البرمجة الذكية،
                  وإنشاء الفيديوهات بالـ AI — كلها بالعربي ومعاك المساعد فاهم.
                </p>
              </div>
              <Link
                href={ROUTES.courses}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium whitespace-nowrap"
              >
                شوف كل الكورسات →
              </Link>
            </div>
            <CourseCarousel
              courses={featuredCourses}
              cardWidthClass="w-[280px] sm:w-[340px]"
              aiPill
            />
          </div>
        </section>
      )}

      {/* ─────────────────────  REST OF COURSES  ───────────────── */}
      {restCourses.length > 0 && (
        <section className="relative px-4 py-12 sm:py-14 border-t border-gray-100 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold">
                  وكمان كورسات عالمية مترجمة بالعربي
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  محتوى منتقى من أحسن المنصات العالمية ومترجم بالعربي — في
                  التواصل، التسويق، البراند، الإنتاجية، ومهارات الشغل الأساسية.
                </p>
              </div>
              <Link
                href={ROUTES.courses}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium whitespace-nowrap"
              >
                تصفّح الكل →
              </Link>
            </div>
            <CourseCarousel courses={restCourses} />
          </div>
        </section>
      )}

      {/* ─────────────────────  PROBLEM / SOLUTION  ───────────────── */}
      <section className="relative px-4 py-14 sm:py-16 border-t border-gray-100 bg-gray-50">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-6">
            ليه فاهم بالظبط؟
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="text-xs font-bold text-red-700 mb-2">المشكلة</div>
              <p className="text-sm text-red-900 leading-relaxed">
                أحسن كورسات الـ AI كلها بالإنجليزي. بتتعلّم لوحدك من غير
                حد تسأله، وبتنسى نص الكورس قبل ما تطبّق أول حاجة.
              </p>
            </div>
            <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-5">
              <div className="text-xs font-bold text-brand-700 mb-2">الحل</div>
              <p className="text-sm text-gray-800 leading-relaxed">
                فاهم بيقدّملك المحتوى بالعربي + معاك مساعد ذكي بيرد عليك
                في أي وقت من قلب الكورس. التطبيق بقى أسرع، والاستيعاب أعمق.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────  COMPARISON  ───────────────── */}
      <section className="relative px-4 py-14 sm:py-16 border-t border-gray-100">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-center mb-2">
            بسعر أقل من كورس واحد بره
          </h2>
          <p className="text-center text-gray-600 mb-8 text-sm">
            خد كل كورسات المنصة + كورسات عالمية مترجمة بالعربي + المساعد
            الذكي + شهادات إتمام، بنفس ميزانية كورس واحد بره.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-bold">
                كورس واحد بره
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-gray-700">~$200</span>
                <span className="text-xs text-gray-500">/ كورس واحد بس</span>
              </div>
              <ul className="space-y-2 text-sm">
                <Feat ok muted text="كورس واحد فقط" />
                <Feat text="بدون مساعد ذكي" />
                <Feat text="بالإنجليزي" />
                <Feat text="بدون دعم بالعربي" />
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-brand-500 bg-brand-500/5 p-5 sm:p-6 shadow-lg shadow-brand-500/10">
              <div className="text-xs text-brand-700 uppercase tracking-wider mb-1 font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-brand-500 text-brand-500" />
                اشتراك فاهم السنوي
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-brand-700">
                  <SARMoney value={p.yearlyAmount} symbolClassName="w-[0.65em] h-[0.65em] mx-1" />
                </span>
                <span className="text-xs text-gray-500">/ سنة كاملة</span>
              </div>
              <ul className="space-y-2 text-sm">
                <Feat ok text="كل كورسات فاهم + كورسات عالمية مترجمة" />
                <Feat ok text="المساعد الذكي فاهم في كل درس" />
                <Feat ok text="كل المحتوى بالعربي" />
                <Feat ok text="شهادة إتمام لكل كورس" />
              </ul>
            </div>
          </div>
          <div className="mt-8">
            <MidCTA />
          </div>
        </div>
      </section>

      {/* ─────────────────────  PRICING  ───────────────── */}
      <section id="pricing" className="relative px-4 py-16 sm:py-20 border-t border-gray-100 bg-gray-50 scroll-mt-20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-3">
              ابدأ خطتك دلوقتي
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              ضمان استرداد 7 أيام — جرّب، ولو ما عجبكش رجّع فلوسك.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto">
            <YearlyCard p={p} />
            <MonthlyCard p={p} />
          </div>
          <div className="text-center mt-6 text-xs text-gray-500">
            <Link href={ROUTES.pricing} className="underline hover:text-foreground">
              شوف كل تفاصيل الباقات
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────  FAQ  ───────────────── */}
      <section className="relative px-4 py-14 sm:py-16 border-t border-gray-100">
        <div className="container mx-auto max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-center mb-8">
            أسئلة شائعة
          </h2>
          <div className="space-y-3">
            <FAQItem
              q="إيه اللي بيميّز خطّة فاهم عن أي منصة تانية؟"
              a="المساعد الذكي 'فاهم' — مدرّب على محتوى كل كورس بالعربي. تسأل أي سؤال جوّه الدرس وتجاوبك في ثوانٍ من قلب المحتوى. ده اللي مش هتلاقيه عند يوديمي أو كورسيرا."
            />
            <FAQItem
              q="إزاي أقدر ألغي التجديد التلقائي؟"
              a="من لوحة حسابك → إدارة الاشتراك → إيقاف التجديد التلقائي. اشتراكك بيفضل شغّال لآخر يوم في المدة المدفوعة."
            />
            <FAQItem
              q="في شهادة إتمام؟"
              a="آه. كل كورس تكمّله بتاخد عليه شهادة رقمية باسمك. الشهادات متاحة في الباقة السنوية فقط."
            />
            <FAQItem
              q="طرق الدفع المتاحة إيه؟"
              a="بطاقات Visa / Mastercard، Apple Pay، PayPal، تحويل عبر براق (Barq) من السعودية، أو InstaPay / Vodafone Cash من مصر. كل الأسعار بالريال السعودي."
            />
            <FAQItem
              q="في ضمان استرجاع؟"
              a="آه — ضمان استرداد 7 أيام بدون أسئلة. لو غيّرت رأيك في أول أسبوع، نرجّع لك مبلغك بالكامل على نفس طريقة الدفع."
            />
            <FAQItem
              q="المساعد الذكي بيشتغل بأي لغة؟"
              a="بالعربي الفصيح والعامية. تكتبله بأي أسلوب وهيرد عليك بنفس الأسلوب — من محتوى الدرس مباشرة."
            />
          </div>
          <div className="mt-8">
            <MidCTA />
          </div>
        </div>
      </section>

      {/* ─────────────────────  FINAL CTA  ───────────────── */}
      <section className="relative px-4 py-16 sm:py-20 border-t border-gray-100 bg-gradient-to-br from-brand-500/10 via-white to-brand-500/5">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-4">
            جاهز تبدأ خطتك الشخصية؟
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mb-8 max-w-xl mx-auto">
            انضم لآلاف المتعلمين العرب اللي اختاروا فاهم — أول منصة عربية
            بمساعد ذكي حقيقي في كل كورس.
          </p>
          <Button asChild size="lg" className="w-full sm:w-auto sm:min-w-[240px] font-bold min-h-[52px]">
            <Link href="#pricing">
              ابدأ خطتك الشخصية
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            ضمان استرداد 7 أيام
          </div>
        </div>
      </section>
    </main>
  );
}

/* ───────────────────────────  BITS  ─────────────────────────── */

/**
 * Mid-page CTA strip used between sections. Full-width on mobile (the
 * spec's 'CTA متكرر' rule) so the visitor never has to scroll back up
 * to convert; sits inline on desktop so the layout doesn't feel like
 * an ad break. Mobile button height is bumped to 52px to clear the
 * iOS/Android touch-target minimum (44/48px) with margin.
 */
function MidCTA() {
  return (
    <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/5 to-white px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-center sm:text-start">
        <p className="font-bold text-sm sm:text-base">
          مستعد تبدأ خطتك الشخصية؟
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          ضمان استرداد 7 أيام · إلغاء في أي وقت
        </p>
      </div>
      <Button asChild size="lg" className="w-full sm:w-auto font-bold min-h-[52px] sm:min-h-0">
        <Link href="#pricing">
          ابدأ خطتك الشخصية
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl sm:text-4xl font-extrabold text-foreground">
        {value}
      </div>
      <div className="text-xs sm:text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

function BulletIcon({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
      <span className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <span>{text}</span>
    </li>
  );
}

function Feat({ text, ok = false, muted = false }: { text: string; ok?: boolean; muted?: boolean }) {
  if (ok) {
    return (
      <li className="flex items-start gap-2.5 text-sm">
        <CheckCircle2
          className={`w-4 h-4 ${muted ? 'text-gray-400' : 'text-brand-500'} mt-0.5 flex-shrink-0`}
        />
        <span className={muted ? 'text-gray-600' : 'text-gray-800'}>{text}</span>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <XCircle className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
      <span className="text-gray-400 line-through decoration-gray-300">{text}</span>
    </li>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white px-4 sm:px-5 py-3">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
        <span className="font-bold text-sm sm:text-base">{q}</span>
        <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl leading-none">
          +
        </span>
      </summary>
      <p className="mt-3 text-sm text-gray-600 leading-relaxed">{a}</p>
    </details>
  );
}

function AssistantMockup() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5 overflow-hidden">
      <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center gap-2 text-xs">
        <Bot className="w-4 h-4 text-brand-500" />
        <span>المساعد الذكي فاهم</span>
        <span className="ms-auto text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          أونلاين
        </span>
      </div>
      <div className="p-4 sm:p-5 space-y-3 bg-gray-50 min-h-[260px]">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-500 text-white text-sm px-4 py-2.5 leading-relaxed">
            ممكن تشرحلي يعني إيه prompt chaining ببساطة؟
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-sm px-4 py-2.5 leading-relaxed text-gray-800">
            تقريباً تخيّل إنك بتدّي ChatGPT مهمة كبيرة فبتقسّمها على
            خطوات — كل خطوة بترد بنتيجة تستخدمها في اللي بعدها. زي ما لو
            بتطلب طبخة، بتقول الأول "هاتلي وصفة"، وبعدها "اعملي قائمة
            تسوّق"، وكده. ده اللي اسمه prompt chaining ✨
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-tr-sm bg-brand-500/90 text-white text-sm px-4 py-2.5">
            يا سلام، فهمت 🙏
          </div>
        </div>
      </div>
      <div className="bg-white border-t border-gray-100 px-4 py-2.5 flex items-center gap-2 text-xs text-gray-400">
        <span>اسأل عن أي حاجة في الدرس…</span>
        <span className="ms-auto text-brand-500">↑</span>
      </div>
    </div>
  );
}

function YearlyCard({ p }: { p: ReturnType<typeof pricingFor> }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-brand-500 bg-white shadow-2xl shadow-brand-500/20 md:scale-[1.03]">
      <div className="absolute top-3 start-3 z-10 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold shadow">
        وفّر {p.savingsPct}%
      </div>
      <div className="bg-brand-500 text-white text-center py-4 px-4">
        <div className="font-display text-xl sm:text-2xl font-extrabold">سنوي</div>
        <div className="inline-flex items-center gap-1 mt-1 text-xs font-bold opacity-95">
          <Star className="w-3 h-3 fill-white" />
          الأكثر مبيعاً
        </div>
      </div>
      <div className="p-6 sm:p-8">
        <div className="text-sm text-gray-400 line-through font-medium text-center mb-1">
          <SARMoney value={p.yearlyAnchor} />/سنة
        </div>
        <div className="text-center mb-3">
          <div className="flex items-baseline justify-center">
            <span className="text-5xl sm:text-6xl font-extrabold font-display text-foreground">
              <SARMoney
                value={p.yearlyPerMonth}
                symbolClassName="w-[0.55em] h-[0.55em] mx-1"
              />
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">/ شهر</div>
        </div>
        <p className="text-xs sm:text-sm text-center text-gray-700 bg-brand-500/5 border border-brand-500/20 rounded-lg py-2 px-3 mb-5 leading-relaxed">
          * تدفع <span className="font-bold"><SARMoney value={p.yearlyAmount} /></span>{' '}
          بدلاً من{' '}
          <span className="font-bold line-through text-gray-400">
            <SARMoney value={p.yearlyAnchor} />
          </span>{' '}
          سنوياً — وفّر{' '}
          <span className="font-bold text-brand-700">
            <SARMoney value={p.savings} />
          </span>{' '}
          ({p.savingsPct}%)
        </p>
        <ul className="space-y-2.5 mb-6">
          <Feat ok text="وصول كامل لكل الكورسات" />
          <Feat ok text="المساعد الذكي فاهم" />
          <Feat ok text="شهادة إتمام لكل كورس" />
          <Feat ok text="أولوية الدعم الفني" />
        </ul>
        <Button asChild size="lg" className="w-full font-bold min-h-[52px]">
          <Link href="/checkout?plan=yearly">
            <Zap className="w-4 h-4" />
            اشتراك الآن
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function MonthlyCard({ p }: { p: ReturnType<typeof pricingFor> }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white">
      <div className="bg-gray-100 text-gray-700 text-center py-4 px-4">
        <div className="font-display text-xl sm:text-2xl font-bold">شهري</div>
        <div className="mt-1 text-xs text-gray-500">مرونة بدون التزام طويل</div>
      </div>
      <div className="p-6 sm:p-8">
        <div className="h-5 mb-1" />
        <div className="text-center mb-3">
          <div className="flex items-baseline justify-center">
            <span className="text-5xl sm:text-6xl font-extrabold font-display text-foreground">
              <SARMoney value={p.monthlyAmount} symbolClassName="w-[0.55em] h-[0.55em] mx-1" />
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">/ شهر</div>
        </div>
        <div className="h-[60px] mb-5" />
        <ul className="space-y-2.5 mb-6">
          <Feat ok muted text="وصول كامل لكل الكورسات" />
          <Feat text="بدون المساعد الذكي فاهم" />
          <Feat text="بدون شهادة إتمام" />
          <Feat text="بدون أولوية الدعم الفني" />
        </ul>
        <Button asChild size="lg" variant="outline" className="w-full font-bold min-h-[52px]">
          <Link href="/checkout?plan=monthly">
            اشتراك الآن
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
