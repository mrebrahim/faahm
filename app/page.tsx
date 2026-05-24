import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME, PLANS } from '@/lib/constants';
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
export default async function HomePage() {
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
              <Link href={ROUTES.signup}>
                ابدأ التعلم الآن
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

          {/* Trust strip */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16 text-gray-500">
            <StatBlock icon={Users} value="1,000+" label="متعلم نشط" />
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
              subtitle="ابدأ بأحد الكورسات الأكثر شعبية بين المتعلمين"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
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

          <div className="grid md:grid-cols-2 gap-6 mt-12 max-w-3xl mx-auto">
            <PricingCard plan={PLANS.monthly} />
            <PricingCard plan={PLANS.yearly} featured />
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="relative px-4 py-24 border-t border-gray-200">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-6">
            جاهز تتعلّم <span className="text-gradient-brand">الذكاء الاصطناعي</span> بالعربي؟
          </h2>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            انضم لآلاف المتعلمين العرب اللي اختاروا فاهم — أول منصة عربية للكورسات بالذكاء الاصطناعي.
          </p>
          <Button asChild size="lg">
            <Link href={ROUTES.signup}>
              اشترك دلوقتي
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
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
            <p className="text-sm text-gray-600 mb-3">
              🔔 سجّل اهتمامك واكون أوّل من يجرّب ذكاء لايف
            </p>
            <form className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
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

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={ROUTES.home} className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg shadow-lg shadow-brand-500/30">
            ف
          </div>
          <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href={ROUTES.courses} className="hover:text-foreground transition-colors">
            الكورسات
          </Link>
          <Link href={ROUTES.pricing} className="hover:text-foreground transition-colors">
            الأسعار
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            عن فاهم
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
                  <Link href={ROUTES.admin}>لوحة الإدارة</Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.dashboard}>لوحتي</Link>
              </Button>
              <form action="/auth/signout" method="POST">
                <Button type="submit" variant="outline" size="sm">
                  خروج
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.login}>دخول</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={ROUTES.signup}>تسجيل</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail_url}
            alt={course.title_ar}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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

function PricingCard({
  plan,
  featured = false,
}: {
  plan: typeof PLANS.monthly | typeof PLANS.yearly;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative p-8 rounded-2xl border transition-all ${
        featured
          ? 'bg-gradient-to-br from-brand-500/10 to-white border-brand-500/50 shadow-2xl shadow-brand-500/10'
          : 'bg-white border-gray-200'
      }`}
    >
      {featured && 'badge' in plan && plan.badge && (
        <div className="absolute -top-3 right-6 px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-full shadow-lg shadow-brand-500/30">
          {plan.badge}
        </div>
      )}

      <h3 className="font-display text-2xl font-bold mb-2">{plan.name}</h3>

      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-5xl font-extrabold font-display">${plan.price}</span>
        <span className="text-gray-500">/ {plan.interval === 'month' ? 'شهر' : 'سنة'}</span>
      </div>

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={featured ? 'default' : 'outline'}
        size="lg"
        className="w-full"
      >
        <Link href={`${ROUTES.signup}?plan=${plan.id}`}>
          اختار {plan.interval === 'month' ? 'الشهري' : 'السنوي'}
        </Link>
      </Button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-gray-200 bg-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
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
              <li><Link href="/instructors" className="hover:text-brand-600">المدرّبين</Link></li>
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
