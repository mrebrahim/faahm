import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { submitLead } from './leads/actions';
import { Button } from '@/components/ui/button';
import { MainNav } from '@/components/main-nav';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { pricingFor } from '@/lib/region';
import { SARMoney } from '@/components/sar-money';
import {
  ArrowLeft,
  Play,
  Sparkles,
  Megaphone,
  Workflow,
  Brain,
  Code,
  Video,
  Briefcase,
  CheckCircle2,
  XCircle,
  Star,
  Award,
  Users,
  BookOpen,
  Clock,
} from 'lucide-react';

// ====================================================================
// Helper: Map category icons
// ====================================================================
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  megaphone: Megaphone,
  workflow: Workflow,
  brain: Brain,
  code: Code,
  video: Video,
  briefcase: Briefcase,
};

// ====================================================================
// MAIN PAGE
// ====================================================================
export default async function HomePage({
  searchParams,
}: {
  searchParams: { lead?: string };
}) {
  const leadParam = searchParams.lead;
  const supabase = createClient();

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  // Fetch featured courses (when courses exist)
  const { data: courses } = await supabase
    .from('courses')
    .select('id, slug, title_ar, thumbnail_url, total_lessons, total_duration_sec')
    .eq('is_published', true)
    .order('sort_order')
    .limit(6);

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      {/* Decorative background orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-brand-500/5 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[40%] -right-40 w-[500px] h-[500px] rounded-full bg-brand-500/[0.03] blur-[100px]"
      />

      <Header />

      {/* ========== HERO ========== */}
      <section className="relative px-4 pt-24 pb-20 lg:pt-32 lg:pb-32">
        <div className="container mx-auto max-w-6xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-brand-500/30 bg-brand-500/10 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-brand-700">
              🚀 الأولى من نوعها في العالم العربي
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.15]">
            <span className="text-foreground">أول منصة عربية</span>
            <br />
            <span className="text-foreground">لكورسات </span>
            <span className="text-gradient-brand">بالذكاء الاصطناعي</span>
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 mb-10 leading-relaxed">
            كورسات مصمّمة ومُقدَّمة بالذكاء الاصطناعي في الأتمتة، التسويق الرقمي،
            صناعة المحتوى، والبرمجة — من خبراء عرب وباشتراك واحد بسيط.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="min-w-[200px]">
              <Link href="/personal-plan">
                احصل على خطتك الشخصية
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-w-[200px]">
              <Link href={ROUTES.courses}>
                <Play className="w-4 h-4" />
                تصفّح الكورسات
              </Link>
            </Button>
          </div>

          {/* Trust strip — 2x2 on phones, single row on md+ */}
          <div className="mt-16 grid grid-cols-2 gap-6 sm:flex sm:flex-wrap sm:justify-center sm:gap-8 md:gap-16 text-gray-500">
            <StatBlock icon={Users} value="1,000+" label="طالب نشط" />
            <StatBlock icon={BookOpen} value="100+" label="كورس بالـ AI" />
            <StatBlock icon={Award} value="500+" label="شهادة صدرت" />
            <StatBlock icon={Clock} value="24/7" label="دعم متواصل" />
          </div>
        </div>
      </section>

      {/* ========== CATEGORIES ========== */}
      <section className="relative px-4 py-20 border-t border-gray-200">
        <div className="container mx-auto max-w-6xl">
          <SectionHeader
            label="التصنيفات"
            title="اختار مجالك"
            subtitle="كل مجال فيه مجموعة كاملة من الكورسات اللي تأخدك من الصفر للاحتراف"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-12">
            {categories?.map((category) => {
              const Icon = CATEGORY_ICONS[category.icon || ''] || BookOpen;
              return (
                <Link
                  key={category.id}
                  href={`${ROUTES.courses}?category=${category.slug}`}
                  className="group relative p-6 rounded-2xl bg-white border border-gray-200 hover:border-brand-500/50 hover:bg-white transition-all duration-300"
                >
                  <div className="w-12 h-12 mb-4 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-brand-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-brand-600 transition-colors">
                    {category.name_ar}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 group-hover:text-brand-500 transition-colors">
                    <span>اعرف أكتر</span>
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== FEATURED COURSES ========== */}
      {courses && courses.length > 0 && (
        <section className="relative px-4 py-20 border-t border-gray-200">
          <div className="container mx-auto max-w-6xl">
            <SectionHeader
              label="الأكثر مشاهدة"
              title="كورسات مختارة لك"
              subtitle="ابدأ بأحد الكورسات الأكثر شعبية بين الطلاب"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button asChild size="lg" variant="outline">
                <Link href={ROUTES.courses}>
                  عرض كل الكورسات
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ========== PRICING ========== */}
      <section className="relative px-4 py-20 border-t border-gray-200">
        <div className="container mx-auto max-w-5xl">
          <SectionHeader
            label="الأسعار"
            title="اشترك واحصل على كل شيء"
            subtitle="مفيش شراء كورسات منفصلة. اشتراك واحد بيفتحلك كل المحتوى."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-3xl mx-auto">
            <PricingCard kind="yearly" featured />
            <PricingCard kind="monthly" />
          </div>
          <p className="text-center text-xs text-gray-500 mt-6">
            <Link href={ROUTES.pricing} className="underline hover:text-foreground">
              شوف كل تفاصيل الباقات
            </Link>
          </p>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="relative px-4 py-24 border-t border-gray-200">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-6">
            جاهز تتعلّم <span className="text-gradient-brand">الذكاء الاصطناعي</span> بالعربي؟
          </h2>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            انضم لأكثر من 1000 طالب عربي اختاروا فاهم — أول منصة عربية للكورسات بالذكاء الاصطناعي.
          </p>
          <Button asChild size="lg">
            <Link href="/personal-plan">
              احصل على خطتك الشخصية
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ========== SERVICE: DUBBING ========== */}
      <section className="relative px-4 py-20 border-t border-gray-200 bg-gradient-to-br from-brand-500/8 via-white to-white overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[120px]"
        />
        <div className="container mx-auto max-w-4xl relative">
          <div className="rounded-3xl border border-brand-500/30 bg-white shadow-2xl shadow-brand-500/10 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-3 text-center lg:text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-brand-500/10 border border-brand-500/30 text-[11px] font-extrabold uppercase tracking-wider text-brand-700">
                🎬 خدمة جديدة
              </div>
              <h2
                className="font-display font-extrabold leading-[1.15] mb-3 text-balance"
                style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}
              >
                دبلج{' '}
                <span className="text-gradient-brand">أي فيديو</span> لأي لغة
              </h2>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-5 max-w-xl">
                ارفعلنا لينك فيديوك، اختار من لغة لأي لغة وأي لهجة، ادفع بالدقيقة،
                واستلم الدبلجة في وقتها. أسرع، أرخص، وبدون تعقيدات.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 text-xs text-gray-600 justify-center lg:justify-start">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  $2 للدقيقة
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  دفع أونلاين
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  ميعاد تسليم فوري
                </span>
              </div>
              <Button asChild size="lg" className="font-bold min-h-[52px] w-full sm:w-auto">
                <Link href="/video-dubbing">
                  دبلج فيديوك دلوقتي
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            <div className="lg:col-span-2 order-first lg:order-last">
              <div className="relative aspect-square max-w-[240px] mx-auto rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-2xl shadow-brand-500/30">
                <span className="text-8xl sm:text-9xl select-none" aria-hidden>
                  🎬
                </span>
                <span className="absolute -top-3 -end-3 bg-white text-brand-700 rounded-full px-3 py-1 text-xs font-extrabold shadow-lg border border-brand-500/30">
                  🌍 أي لغة
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== COMING SOON: ذكاء لايف ========== */}
      <section className="relative px-4 py-20 border-t border-gray-200 bg-gradient-to-br from-gray-50 via-white to-brand-50/30 overflow-hidden">
        {/* Background decorative elements */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-brand-500/[0.04] blur-[120px]"
        />

        <div className="container mx-auto max-w-4xl text-center relative">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border-2 border-dashed border-brand-500/40 bg-white">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
            </span>
            <span className="text-sm font-bold text-brand-700 tracking-wide">
              قريبًا
            </span>
          </div>

          {/* Main heading */}
          <h2 className="font-display text-5xl md:text-7xl font-extrabold mb-4 leading-tight">
            <span className="text-gradient-brand">ذكاء لايف</span>
          </h2>

          {/* Tagline */}
          <p className="text-xl md:text-2xl font-semibold text-foreground mb-3">
            جلسات تعليمية تفاعلية مباشرة بالذكاء الاصطناعي
          </p>

          {/* Description */}
          <p className="max-w-2xl mx-auto text-gray-600 text-base md:text-lg mb-8 leading-relaxed">
            تعلّم لحظيًا مع مدرّب AI ذكي يجاوبك، يصحّحلك، ويفصّل المحتوى على
            احتياجك — تجربة تعليمية شخصية بالكامل، أول مرة في العالم العربي.
          </p>

          {/* Features preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-10">
            <FeatureCard
              icon={Sparkles}
              title="مدرّب AI شخصي"
              desc="يفهم مستواك ويعلّمك بالطريقة اللي تناسبك"
            />
            <FeatureCard
              icon={Play}
              title="جلسات لايف"
              desc="تفاعل مباشر، تطبيق عملي، نتايج فورية"
            />
            <FeatureCard
              icon={Award}
              title="شهادات معتمدة"
              desc="بعد إتمام كل مسار تعليمي"
            />
          </div>

          {/* Notify me CTA */}
          <div className="mt-12 p-6 rounded-2xl bg-white border-2 border-brand-500/20 max-w-2xl mx-auto">
            {leadParam === 'ok' ? (
              <p className="text-sm text-brand-700 font-medium text-center">
                ✅ تم تسجيل اهتمامك! هنبعتلك أوّل ما ذكاء لايف يبقى متاح.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  🔔 سجّل اهتمامك واكون أوّل من يجرّب ذكاء لايف
                </p>
                <form
                  action={submitLead}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <input type="hidden" name="source" value="homepage_zaka_live" />
                  <input type="hidden" name="next" value="/?lead=ok#zaka-live" />
                  <input
                    type="email"
                    name="email"
                    placeholder="بريدك الإلكتروني"
                    required
                    dir="ltr"
                    className="flex-1 h-11 px-4 rounded-lg border border-gray-300 bg-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                  <Button type="submit">
                    سجّل اهتمامي
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </form>
                {leadParam === 'invalid' && (
                  <p className="text-xs text-red-600 mt-2 text-center">
                    من فضلك أدخل بريداً إلكترونياً صحيحاً.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-white border border-gray-200 hover:border-brand-500/40 transition-colors">
      <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-brand-500/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-brand-500" />
      </div>
      <h3 className="font-bold mb-1 text-sm">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

// ====================================================================
// SUB-COMPONENTS
// ====================================================================

async function Header() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Resolve role for logged-in users so admins see a discreet shortcut.
  // Non-admins (and guests) get exactly the same HTML they had before, so
  // the existence of /admin is never leaked publicly.
  let isAdmin = false;
  if (user) {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const service = createServiceClient();
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  return <MainNav signedIn={!!user} isAdmin={isAdmin} />;
}

function StatBlock({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-brand-500" />
      <div className="text-right">
        <div className="font-bold text-xl text-foreground">{value}</div>
        <div className="text-xs">{label}</div>
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  title,
  subtitle,
}: {
  label: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase text-brand-600 bg-brand-500/10 rounded-full">
        {label}
      </div>
      <h2 className="font-display text-3xl md:text-4xl font-extrabold mb-3">{title}</h2>
      <p className="text-gray-500">{subtitle}</p>
    </div>
  );
}

function CourseCard({ course }: { course: any }) {
  return (
    <Link
      href={ROUTES.course(course.slug)}
      className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 hover:border-brand-500/50 transition-all duration-300"
    >
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={course.title_ar}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            quality={70}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/20 to-gray-100">
            <BookOpen className="w-12 h-12 text-brand-500/40" />
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-brand-600 transition-colors">
          {course.title_ar}
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {course.total_lessons} درس
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Home-page pricing card. Reads SAR amounts straight off the
 * region-aware pricingFor('us') helper — same source-of-truth the
 * /pricing surface uses, so the two pages can't drift. CTAs link
 * directly to /checkout (guest-checkout aware), never /signup, so the
 * visitor isn't bounced through a sign-up gate before paying.
 */
function PricingCard({
  kind,
  featured = false,
}: {
  kind: 'monthly' | 'yearly';
  featured?: boolean;
}) {
  const p = pricingFor('us');
  const isYearly = kind === 'yearly';

  return (
    <div
      className={`relative p-8 rounded-2xl border transition-all ${
        featured
          ? 'bg-gradient-to-br from-brand-500/10 to-white border-brand-500/50 shadow-2xl shadow-brand-500/10'
          : 'bg-white border-gray-200'
      }`}
    >
      {featured && (
        <div className="absolute -top-3 end-6 inline-flex items-center gap-1 px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-full shadow-lg shadow-brand-500/30">
          <Star className="w-3 h-3 fill-white" />
          الأكثر مبيعاً
        </div>
      )}

      <h3 className="font-display text-2xl font-bold mb-2">
        {isYearly ? 'الاشتراك السنوي' : 'الاشتراك الشهري'}
      </h3>

      {isYearly && (
        <div className="text-sm text-gray-400 line-through font-medium mb-1">
          <SARMoney value={p.yearlyAnchor} />/سنة
        </div>
      )}

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-5xl font-extrabold font-display">
          <SARMoney
            value={isYearly ? p.yearlyAmount : p.monthlyAmount}
            symbolClassName="w-[0.55em] h-[0.55em] mx-1"
          />
        </span>
        <span className="text-gray-500">{isYearly ? '/ سنة' : '/ شهر'}</span>
      </div>

      {isYearly && (
        <p className="text-xs text-brand-700 bg-brand-500/5 border border-brand-500/20 rounded-lg py-2 px-3 mb-5 leading-relaxed">
          وفّر <SARMoney value={p.savings} /> ({p.savingsPct}%) لفترة محدودة
        </p>
      )}
      {!isYearly && <div className="mb-5 h-[36px]" />}

      <ul className="space-y-3 mb-8">
        {isYearly ? (
          <>
            <Feat ok text="وصول كامل لكل الكورسات" />
            <Feat ok text="كورسات n8n و AI Video و Vibe Coding" />
            <Feat ok text="المساعد الذكي فاهم" />
            <Feat ok text="شهادة إتمام لكل كورس" />
            <Feat ok text="أولوية الدعم الفني" />
          </>
        ) : (
          <>
            <Feat ok text="وصول لمعظم الكورسات" muted />
            <Feat text="بدون n8n و AI Video و Vibe Coding" />
            <Feat text="بدون المساعد الذكي فاهم" />
            <Feat text="بدون شهادة إتمام" />
            <Feat text="بدون أولوية الدعم الفني" />
          </>
        )}
      </ul>

      <Button
        asChild
        variant={featured ? 'default' : 'outline'}
        size="lg"
        className="w-full"
      >
        <Link href={`/checkout?plan=${kind}`}>
          {isYearly ? 'اختار السنوي' : 'اختار الشهري'}
        </Link>
      </Button>
    </div>
  );
}

function Feat({ text, ok = false, muted = false }: { text: string; ok?: boolean; muted?: boolean }) {
  if (ok) {
    return (
      <li className="flex items-start gap-3 text-sm">
        <CheckCircle2
          className={`w-5 h-5 ${muted ? 'text-gray-400' : 'text-brand-500'} mt-0.5 flex-shrink-0`}
        />
        <span className={muted ? 'text-gray-600' : 'text-gray-700'}>{text}</span>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-3 text-sm">
      <XCircle className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
      <span className="text-gray-400 line-through decoration-gray-300">{text}</span>
    </li>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-gray-200 bg-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-display font-extrabold text-white">
                ف
              </div>
              <span className="font-display font-extrabold text-lg">{APP_NAME}</span>
            </div>
            <p className="text-sm text-gray-500">
              أول منصة عربية لكورسات بالذكاء الاصطناعي
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-sm">المنصة</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href={ROUTES.courses} className="hover:text-brand-600">الكورسات</Link></li>
              <li><Link href={ROUTES.pricing} className="hover:text-brand-600">الأسعار</Link></li>
              <li><Link href="/career" className="hover:text-brand-600">التيست المهني</Link></li>
              <li><Link href="/personality" className="hover:text-brand-600">اختبار الشخصية</Link></li>
              <li><Link href="/ai-readiness" className="hover:text-brand-600">جاهزية الـ AI</Link></li>
              <li><Link href="/self-discovery" className="hover:text-brand-600">اكتشاف الذات</Link></li>
              <li><Link href="/ai-skills" className="hover:text-brand-600">سلّم الـ AI</Link></li>
              <li><Link href="/productivity" className="hover:text-brand-600">ليه بتأجّل؟</Link></li>
              <li><Link href="/entrepreneurship" className="hover:text-brand-600">تكسب من الـ AI؟</Link></li>
              <li><Link href="/eq" className="hover:text-brand-600">الذكاء العاطفي</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-sm">الدعم</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/help" className="hover:text-brand-600">مركز المساعدة</Link></li>
              <li><Link href="/contact" className="hover:text-brand-600">تواصل معنا</Link></li>
              <li><Link href="/faq" className="hover:text-brand-600">أسئلة شائعة</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-sm">قانوني</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/terms" className="hover:text-brand-600">شروط الاستخدام</Link></li>
              <li><Link href="/privacy" className="hover:text-brand-600">سياسة الخصوصية</Link></li>
              <li><Link href="/refund" className="hover:text-brand-600">سياسة الاسترداد</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} {APP_NAME} — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}
