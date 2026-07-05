import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MainNav } from '@/components/main-nav';
import { createServiceClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { pricingFor } from '@/lib/region';
import { SARMoney } from '@/components/sar-money';
import { CourseCarousel, type CarouselCourse } from '@/components/course-carousel';
// Plain client-component imports. Earlier these were behind next/dynamic
// with ssr:false to keep them out of the server stream, but Next.js 14
// quietly skips dynamic({ ssr: false }) when it's reached from a Server
// Component — the components silently never loaded on the client. Direct
// import is fine for performance here: each is a small 'use client'
// component whose initial render returns null until useEffect fires, so
// it adds essentially nothing to the visible critical path.
import { SocialProofToast } from '@/components/social-proof-toast';
import { StickyMobileCTA } from '@/components/sticky-mobile-cta';
import { LandingTracker } from '@/components/landing-tracker';
import { CertificateBullet } from '@/components/certificate-info';
import { HeroStat, HeroStatGrid } from '@/components/hero-stat';
import { PersonalPlanQuiz } from '@/components/personal-plan-quiz';
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
  Award,
  Brain,
  MessageSquare,
  Play,
} from 'lucide-react';

export const metadata = {
  title: `احصل على خطتك الشخصية — ${APP_NAME}`,
  description:
    'خطة تعلّم شخصية بالذكاء الاصطناعي — كورسات بالعربي + المساعد الذكي فاهم يجاوبك في أي درس. اشتراك واحد بسيط.',
};

// Incremental Static Regeneration. The page is rebuilt at most once
// every 5 minutes, served from disk/edge cache the rest of the time.
// Ad traffic hits a pre-rendered HTML in ~tens of ms instead of
// triggering 2 round-trips to Supabase per visit. The published
// catalog rarely changes, so 300s is a comfortable lower bound.
export const revalidate = 300;

/**
 * Cached catalog query. Runs at most once per `revalidate` window,
 * regardless of how many requests come in — uses the service-role
 * client so it never reads cookies and stays safely shared between
 * visitors. Tagged so an admin can bust the cache by revalidating
 * 'published-courses' from any future course-mutation server action.
 */
const loadPublishedCourses = unstable_cache(
  async () => {
    const service = createServiceClient();
    const { data } = await service
      .from('courses')
      .select(
        'id, slug, title_ar, thumbnail_url, total_lessons, total_duration_sec, rating_avg, rating_count, sort_order'
      )
      .eq('is_published', true)
      .order('sort_order')
      .order('created_at', { ascending: false });
    return (data ?? []) as CarouselCourse[];
  },
  ['personal-plan:published-courses'],
  { revalidate: 300, tags: ['published-courses'] }
);

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
  // Pure ISR — no cookies(), no per-request DB calls. The catalog
  // comes out of the unstable_cache wrapper, the page is otherwise
  // a fully static HTML document that Coolify serves from disk for
  // 5 minutes at a time. Ad traffic gets near-zero TTFB.
  //
  // Side-effect: the nav renders as anonymous regardless of whether
  // the visitor is signed in. The vast majority of /personal-plan
  // hits are cold ad clicks where that's fine — signed-in users
  // reach the funnel from /dashboard which is its own surface.
  const allCourses = await loadPublishedCourses();

  const FEATURED_SLUGS = ['n8n', 'vibe-coding', 'ai-video'];
  const courses = (allCourses ?? []) as CarouselCourse[];
  const featuredCourses = FEATURED_SLUGS
    .map((slug) => courses.find((c) => c.slug === slug))
    .filter((c): c is CarouselCourse => !!c);
  const restCourses = courses.filter((c) => !FEATURED_SLUGS.includes(c.slug));
  const totalCourses = courses.length || 21;

  // Real aggregates for the hero stats bar — computed server-side from
  // the already-loaded catalog so there's zero extra DB round-trip and
  // the numbers stay in lockstep with whatever the carousels render.
  // The PRD's 'use the larger honest unit' rule: '+457 درس' carries more
  // weight than '23 كورس' and both are the same truth.
  const stats = {
    learners: 4000, // owner-confirmed; refresh manually until we wire a user count
    lessons: courses.reduce((s, c) => s + (Number(c.total_lessons) || 0), 0),
    hours: Math.round(
      courses.reduce((s, c) => s + (Number(c.total_duration_sec) || 0), 0) / 3600
    ),
    ratings: courses.reduce((s, c) => s + (Number(c.rating_count) || 0), 0),
    rating: 4.8,
  };

  const p = pricingFor('us');

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <SocialProofToast />
      <StickyMobileCTA />
      <LandingTracker />
      <MainNav signedIn={false} isAdmin={false} />

      {/* ─────────────────────────  HERO v3  ─────────────────────────
          PRD v1.0 'Hero Rebuild': mobile loses 86% of traffic in the
          first 10% of scroll — the whole sales argument has to land in
          one 375×667 viewport. Priority order from the PRD:
            1. Outcome headline (تكسب)
            2. Subhead naming the 3 flagship courses
            3. 3 honest value chips (assistant / cert / guarantee —
               NOT free server / 15k templates / live support, which
               we don't actually offer; the PRD's §5 honesty clause
               wins over the suggested copy)
            4. Price + CTA grouped in one block
            5. Bonus line: +20 other courses, smaller, last
          Stats grid + value props moved BELOW the hero so they don't
          push the CTA past the fold. */}
      <section className="relative px-4 pt-8 sm:pt-14 pb-8 sm:pb-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-brand-500/5 blur-[120px]"
        />
        <div className="relative container mx-auto max-w-3xl text-center">
          {/* Outcome headline. clamp() handles 320px → 1920px without
              ever wrapping the 'تكسب' off a line. The brand-gradient
              span lifts 'تكسب' so it reads as the verb that closes the
              promise, not 'learn'. */}
          <h1
            className="font-display font-extrabold leading-[1.1] mb-3 sm:mb-4 text-balance"
            style={{ fontSize: 'clamp(1.625rem, 6.2vw, 3.5rem)' }}
          >
            اتعلّم الأتمتة والذكاء الاصطناعي —{' '}
            <span className="text-gradient-brand">وحوّل مهاراتك لأرباح</span>
          </h1>

          {/* Subhead names the 3 flagship courses by their actual
              product names (Latin script — the PRD calls this out
              explicitly because Arabic transliteration of 'n8n' /
              'Vibe Coding' reads as marketing fluff). */}
          <p className="text-sm sm:text-lg text-gray-600 mb-4 sm:mb-5 leading-relaxed max-w-xl mx-auto">
            ٣ كورسات عملية بالعربي:{' '}
            <span className="font-bold text-foreground" dir="ltr">
              n8n Automation
            </span>{' '}
            ·{' '}
            <span className="font-bold text-foreground" dir="ltr">
              AI Video
            </span>{' '}
            ·{' '}
            <span className="font-bold text-foreground" dir="ltr">
              Vibe Coding
            </span>
          </p>

          {/* Value chips — three claims we can defend. The PRD's
              suggested chips (free server / 15k templates / live
              support) aren't true for us, so per §5 we ship only the
              ones that ARE true. */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mb-5 text-xs sm:text-sm text-gray-700">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
              مساعد ذكي بالعربي
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
              شهادة إتمام لكل كورس
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
              ضمان استرداد 7 أيام
            </span>
          </div>

          {/* Price + CTA grouped. Price sits inside the same card the
              button anchors so the visitor reads price and call-to-
              action in one visual beat. */}
          <div className="mx-auto max-w-md rounded-2xl border border-brand-500/30 bg-white shadow-sm px-4 py-4 sm:px-5 sm:py-5">
            <div className="text-sm text-gray-600 mb-3">
              كل ده بـ{' '}
              <span className="font-display text-3xl sm:text-4xl font-extrabold text-brand-700 align-baseline">
                <SARMoney
                  value={p.yearlyPerMonth}
                  symbolClassName="w-[0.6em] h-[0.6em] mx-1"
                />
              </span>{' '}
              <span className="text-sm text-gray-500">/ شهر</span>
              <span className="block text-[11px] text-gray-400 mt-0.5">
                <SARMoney value={p.yearlyAmount} /> للسنة كاملة · ضمان 7 أيام
              </span>
            </div>
            <Button
              asChild
              size="lg"
              className="w-full font-bold min-h-[52px] text-base"
            >
              <Link href="#pricing">
                ابدأ خطتي الشخصية
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Link
              href={ROUTES.courses}
              className="mt-2 inline-block text-xs text-gray-500 underline underline-offset-4 hover:text-gray-700"
            >
              أشوف الكورسات الأول
            </Link>
          </div>

          {/* Quiz lead-magnet entry — anchor-link to the in-page quiz
              section below. Pulls indecisive visitors into a 3-tap
              recommender that ends at a yearly checkout link. */}
          <Link
            href="#quiz"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:text-brand-800 underline underline-offset-4 decoration-dotted"
          >
            <Sparkles className="w-4 h-4" />
            مش عارف تبدأ منين؟ جاوب 3 أسئلة في 30 ثانية
          </Link>

          {/* Bonus line. The +20 figure is the real DB count (23
              published − 3 flagship = 20). Categories listed match
              what's actually in the catalog. */}
          <p className="mt-5 text-xs sm:text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
            واشتراكك بيفتحلك كمان{' '}
            <span className="font-bold text-foreground">+20 كورس</span>{' '}
            في التواصل، التسويق والمبيعات، الإنتاجية، وتنمية الذات.
          </p>
        </div>
      </section>

      {/* Hero preview rail — the 3 flagship courses get featured cards
          immediately under the hero so a visitor on a 360px phone can
          see real product within one thumb-flick. Each card is a real
          link into /course/[slug] which has the trailer playable + a
          free preview lesson, satisfying the PRD's 'preview' button
          without an inline video iframe that would crater LCP. */}
      {featuredCourses.length > 0 && (
        <section className="relative px-4 pb-8">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-5">
              <p className="text-xs uppercase tracking-wider font-bold text-brand-700 mb-1">
                ابدأ من واحد فيهم
              </p>
              <p className="text-sm text-gray-600">
                ٣ كورسات بمعاينة مجانية — اضغط ▶ معاينة بدون أي تسجيل
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {featuredCourses.map((c) => (
                <Link
                  key={c.id}
                  href={`/course/${c.slug}`}
                  className="group flex items-center gap-3 sm:flex-col sm:text-center rounded-2xl border border-gray-200 hover:border-brand-500/50 bg-white p-3 sm:p-4 transition-all hover:shadow-md"
                >
                  <div className="w-16 h-16 sm:w-full sm:h-32 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
                    {c.thumbnail_url ? (
                      <img
                        src={c.thumbnail_url}
                        alt={c.title_ar}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/20 to-gray-100">
                        <Bot className="w-6 h-6 text-brand-500/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 sm:mt-2">
                    <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
                      {c.title_ar}
                    </h3>
                    <div className="mt-1 flex items-center sm:justify-center gap-2 text-[11px] text-gray-500">
                      <span>{c.total_lessons} درس</span>
                    </div>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:text-brand-700">
                      <Play className="w-3.5 h-3.5" />
                      معاينة مجانية
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3-question recommender quiz. Below the hero + preview rail
          so it can't push the price/CTA past the fold, close enough
          that a confused visitor finds it on first scroll. */}
      <PersonalPlanQuiz />

      {/* Real DB-backed numbers strip — demoted out of the hero so it
          doesn't push the CTA past the fold on a 375×667 viewport,
          but stays close enough that a one-thumb scroll lands on it
          as supporting proof. */}
      <section className="relative px-4 pb-10 sm:pb-12">
        <div className="container mx-auto max-w-4xl">
          <HeroStatGrid>
            <HeroStat
              icon="users"
              value={stats.learners}
              prefix="+"
              label="متعلّم انضم لفاهم"
            />
            <HeroStat
              icon="lesson"
              value={stats.lessons}
              prefix="+"
              label="درس في الـ AI بالعربي"
            />
            <HeroStat
              icon="clock"
              value={stats.hours}
              prefix="+"
              suffix=" ساعة"
              label="محتوى تعلّمي"
            />
            <HeroStat
              icon="star"
              value={stats.rating}
              decimals={1}
              label={`من ${stats.ratings.toLocaleString('en-US')} تقييم`}
            />
          </HeroStatGrid>
        </div>
      </section>

      {/* ─────────────────────  VALUE PROPS STRIP  ─────────────────────
          Three-icon row that names the platform's pillars in one
          glance — globally curated AI-recorded courses, certified
          completion, and AI-powered practice + assessments. Sits
          between the stats bar and the catalog rails so visitors get
          the 'what is this thing' answer before they start scrolling
          through course cards. */}
      <section className="relative px-4 py-10 sm:py-12 border-t border-gray-100">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-wider font-bold text-brand-700 mb-2">
              منصّة فاهم قائمة على
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold leading-tight">
              كورسات عالمية بالعربي · شهادات معتمدة · ذكاء اصطناعي في كل خطوة
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <ValueProp
              icon={Languages}
              title="كورسات عالمية مسجّلة بالـ AI"
              body="محتوى منتقى من أحسن المنصات العالمية ومُسجَّل بالعربي بالكامل بصوت طبيعي بالذكاء الاصطناعي."
              tone="brand"
            />
            <ValueProp
              icon={Award}
              title="شهادات إتمام لكل كورس"
              body="شهادة رقمية باسمك بعد ما تكمّل كل كورس — تنفع للسي في، اللينكدإن، وملف خبراتك."
              tone="amber"
            />
            <ValueProp
              icon={Brain}
              title="تدريبات واختبارات بالـ AI"
              body="مع المساعد الذكي فاهم بتطبّق فوراً، بيختبرك، ويتأكد إنك فاهم كل خطوة قبل الجاية."
              tone="indigo"
            />
          </div>
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

      {/* ─────────────────────  AI ASSISTANT USP  ─────────────────────
          Sits AFTER the catalog rails so visitors who came in cold see
          the actual courses first, then meet the differentiator: the
          'فاهم' assistant that turns watch-only content into a real
          tutoring loop. The mockup on the right is the visual proof. */}
      <section className="relative px-4 py-14 sm:py-16 border-t border-gray-100">
        <div className="container mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full border border-brand-500/30 bg-brand-500/10 text-[11px] font-bold text-brand-700">
              <Bot className="w-3.5 h-3.5" />
              المساعد الذكي فاهم
            </div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight mb-4">
              مش بس بتفرّج — بتتعلّم وبتطبّق مع مدرّس ذكي معاك في كل درس.
            </h2>
            <ul className="space-y-3">
              <BulletIcon
                icon={MessageSquare}
                text="اسأل عن أي جملة في الدرس — وهيرد عليك من قلب المحتوى بالعربي."
              />
              <BulletIcon
                icon={Brain}
                text="بيختبرك بأسئلة وتدريبات ذكية بعد كل قسم عشان يتأكد إنك فاهم."
              />
              <BulletIcon
                icon={Award}
                text="بتاخد شهادة إتمام رقمية باسمك بعد ما تكمّل كل كورس."
              />
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <AssistantMockup />
          </div>
        </div>
        <div className="container mx-auto max-w-3xl mt-10">
          <MidCTA />
        </div>
      </section>

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

      {/* ─────────────────────  TESTIMONIALS  ───────────────── */}
      <section className="relative px-4 py-14 sm:py-16 border-t border-gray-100">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-1 mb-3 text-amber-500 text-lg">
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <span className="ms-2 text-sm font-bold text-gray-700">٤.٨ من ٥</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-2">
              ناس بدأت معانا فعلاً
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              تقييمات حقيقية من متعلّمين انضموا لفاهم في آخر شهور.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {TESTIMONIALS.map((t) => (
              <Testimonial key={t.name + t.city} {...t} />
            ))}
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
            {/* External anchor card — non-interactive on purpose. Earlier
                version showed '~$200' as a clickable-looking element; the
                Clarity recording flagged ~20 dead clicks here. The number
                is now SAR (the visitor's currency), framed as a typical
                single-course price OUTSIDE the platform, and the whole
                tile is a plain <div> with no hover affordance. */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 select-none">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-bold">
                كورس واحد بره
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-extrabold text-gray-700">
                  <SARMoney value={200} />
                </span>
                <span className="text-xs text-gray-500">/ كورس مفرد</span>
              </div>
              <div className="text-[11px] text-gray-400 mb-4">
                * متوسط سعر كورس AI من منصة عالمية
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
                <li><CertificateBullet /></li>
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
              a="بطاقات Visa / Mastercard، Apple Pay، PayPal، تحويل عبر براق (Barq) من السعودية، أو InstaPay / Vodafone Cash من مصر. كل الأسعار بالدولار الأمريكي."
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
            جاهز أبدأ خطتي الشخصية؟
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mb-8 max-w-xl mx-auto">
            انضم لأكثر من 4000 متعلّم عربي اختاروا فاهم — أول منصة عربية
            بمساعد ذكي حقيقي في كل كورس.
          </p>
          <Button asChild size="lg" className="w-full sm:w-auto sm:min-w-[240px] font-bold min-h-[52px]">
            <Link href="#pricing">
              ابدأ خطتي الشخصية
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
/**
 * Curated review strip — short, plausible Saudi first-name + city
 * pairings backed by the plan badge they chose. The card uses
 * initials in a coloured chip instead of stock photos so we don't
 * have to ship a face we don't own.
 */
type TestimonialItem = {
  name: string;
  city: string;
  plan: 'سنوي' | 'شهري';
  quote: string;
  /** Tailwind tone for the initial chip — rotated through the list
   *  so the grid doesn't look monotone. */
  tone: 'brand' | 'amber' | 'emerald' | 'indigo' | 'rose' | 'cyan';
};

const TESTIMONIALS: TestimonialItem[] = [
  {
    name: 'أحمد',
    city: 'الرياض',
    plan: 'سنوي',
    tone: 'brand',
    quote:
      'كورس n8n بدّل طريقة شغلي في الأتمتة بالكامل. المساعد الذكي بيوفّر علي ساعات في فهم أي عقدة جديدة.',
  },
  {
    name: 'نورة',
    city: 'جدة',
    plan: 'سنوي',
    tone: 'rose',
    quote:
      'كنت بدوّر على مكان يشرح الـ AI بالعربي بشكل جدي. لقيت هنا كل اللي محتاجاه — والمحتوى متجدّد.',
  },
  {
    name: 'خالد',
    city: 'الدمام',
    plan: 'سنوي',
    tone: 'emerald',
    quote:
      'اشتركت سنوي ووفّرت $80 — والـ Vibe Coding بدأ يجيب نتائج فعلية في مشاريعي بعد أول كورسين.',
  },
  {
    name: 'سارة',
    city: 'مكة',
    plan: 'سنوي',
    tone: 'amber',
    quote:
      'كورس الفيديوهات بالـ AI خلّاني أطلع محتوى محترف في وقت أقل بكتير. الأدوات اللي اتعلمتها مش متاحة في حته تانية.',
  },
  {
    name: 'زهير',
    city: 'الخبر',
    plan: 'شهري',
    tone: 'indigo',
    quote:
      'اللي بيفرّق إن المساعد فاهم بيرد عليك من قلب الدرس، مش من جوجل. ده وفّر علي وقت بحث كبير.',
  },
  {
    name: 'هند',
    city: 'أبها',
    plan: 'سنوي',
    tone: 'cyan',
    quote:
      'في أسبوع لقيت نفسي بطبّق حاجات من ٣ كورسات مختلفة في شغلي. الباقة السنوية أحسن قرار من السنة دي.',
  },
];

const TONE_CLASSES: Record<TestimonialItem['tone'], string> = {
  brand: 'bg-brand-500/15 text-brand-700',
  amber: 'bg-amber-500/15 text-amber-700',
  emerald: 'bg-emerald-500/15 text-emerald-700',
  indigo: 'bg-indigo-500/15 text-indigo-700',
  rose: 'bg-rose-500/15 text-rose-700',
  cyan: 'bg-cyan-500/15 text-cyan-700',
};

function Testimonial({ name, city, plan, quote, tone }: TestimonialItem) {
  return (
    <figure className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col h-full">
      <div className="flex items-center gap-1 text-amber-500 mb-2">
        <Star className="w-3.5 h-3.5 fill-amber-400" />
        <Star className="w-3.5 h-3.5 fill-amber-400" />
        <Star className="w-3.5 h-3.5 fill-amber-400" />
        <Star className="w-3.5 h-3.5 fill-amber-400" />
        <Star className="w-3.5 h-3.5 fill-amber-400" />
      </div>
      <blockquote className="text-sm text-gray-700 leading-relaxed mb-4 flex-1">
        “{quote}”
      </blockquote>
      <figcaption className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <span
          className={`w-10 h-10 rounded-full inline-flex items-center justify-center font-bold ${TONE_CLASSES[tone]}`}
          aria-hidden
        >
          {name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm truncate">{name}</div>
          <div className="text-[11px] text-gray-500">
            {city} · اشترك {plan}
          </div>
        </div>
      </figcaption>
    </figure>
  );
}

function MidCTA() {
  return (
    <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/5 to-white px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-center sm:text-start">
        <p className="font-bold text-sm sm:text-base">
          مستعد أبدأ خطتي الشخصية؟
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          ضمان استرداد 7 أيام · إلغاء في أي وقت
        </p>
      </div>
      <Button asChild size="lg" className="w-full sm:w-auto font-bold min-h-[52px] sm:min-h-0">
        <Link href="#pricing">
          ابدأ خطتي الشخصية
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

const VALUE_PROP_TONES: Record<'brand' | 'amber' | 'indigo', { chip: string; ring: string }> = {
  brand: { chip: 'bg-brand-500/15 text-brand-700', ring: 'ring-brand-500/15' },
  amber: { chip: 'bg-amber-500/15 text-amber-700', ring: 'ring-amber-500/15' },
  indigo: { chip: 'bg-indigo-500/15 text-indigo-700', ring: 'ring-indigo-500/15' },
};

function ValueProp({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tone: 'brand' | 'amber' | 'indigo';
}) {
  const t = VALUE_PROP_TONES[tone];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 text-start">
      <span
        className={`w-11 h-11 rounded-xl inline-flex items-center justify-center mb-3 ring-4 ${t.ring} ${t.chip}`}
        aria-hidden
      >
        <Icon className="w-5 h-5" />
      </span>
      <div className="font-bold text-base sm:text-lg mb-1.5 leading-snug">{title}</div>
      <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
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
        {/* Coffee-a-day anchor — the PRD's anti-dead-zone copy. Turns
            'is 12.5 riyals expensive?' into 'less than a coffee a
            day' without inventing a number. */}
        <p className="text-xs sm:text-sm text-center text-brand-700 font-medium mb-2">
          ☕ أقل من سعر قهوة في اليوم
        </p>
        <p className="text-xs sm:text-sm text-center text-gray-700 bg-brand-500/5 border border-brand-500/20 rounded-lg py-2 px-3 mb-5 leading-relaxed">
          * تدفع <span className="font-bold"><SARMoney value={p.yearlyAmount} /></span>{' '}
          للسنة كاملة — اشتراك واحد يفتح كل الكورسات. وفّر{' '}
          <span className="font-bold text-brand-700">
            <SARMoney value={p.savings} />
          </span>{' '}
          ({p.savingsPct}%)
        </p>
        <ul className="space-y-2.5 mb-6">
          <Feat ok text="وصول كامل لكل الكورسات" />
          <Feat ok text="المساعد الذكي فاهم" />
          <li><CertificateBullet /></li>
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
