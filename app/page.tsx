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
    <main className="relative min-h-screen overflow-hidden bg-ink">
      {/* Decorative background orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-brand-500/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[40%] -right-40 w-[500px] h-[500px] rounded-full bg-brand-500/5 blur-[100px]"
      />

      <Header />

      {/* ========== HERO ========== */}
      <section className="relative px-4 pt-24 pb-20 lg:pt-32 lg:pb-32">
        <div className="container mx-auto max-w-6xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-brand-500/30 bg-brand-500/10 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-brand-100">
              منصة فاهم — تعلّم من خبراء عرب
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            <span className="text-foreground">اتعلم بقى</span>
            <br />
            <span className="text-gradient-brand">بطريقة فاهمة</span>
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-ink-300 mb-10 leading-relaxed">
            مئات الكورسات في التسويق، الأتمتة، الذكاء الاصطناعي، والبرمجة —
            باشتراك واحد وبأسعار في متناول الجميع.
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
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16 text-ink-400">
            <StatBlock icon={Users} value="1,000+" label="متعلم نشط" />
            <StatBlock icon={BookOpen} value="100+" label="كورس عربي" />
            <StatBlock icon={Award} value="500+" label="شهادة صدرت" />
            <StatBlock icon={Clock} value="24/7" label="دعم متواصل" />
          </div>
        </div>
      </section>

      {/* ========== CATEGORIES ========== */}
      <section className="relative px-4 py-20 border-t border-ink-800/50">
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
                  className="group relative p-6 rounded-2xl bg-ink-800/40 border border-ink-700/50 hover:border-brand-500/50 hover:bg-ink-800/80 transition-all duration-300"
                >
                  <div className="w-12 h-12 mb-4 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-brand-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-brand-400 transition-colors">
                    {category.name_ar}
                  </h3>
                  <div className="flex items-center text-sm text-ink-400 group-hover:text-brand-500 transition-colors">
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
        <section className="relative px-4 py-20 border-t border-ink-800/50">
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
      <section className="relative px-4 py-20 border-t border-ink-800/50">
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
      <section className="relative px-4 py-24 border-t border-ink-800/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-6">
            جاهز تبدأ <span className="text-gradient-brand">رحلتك التعليمية</span>؟
          </h2>
          <p className="text-ink-300 text-lg mb-8 max-w-2xl mx-auto">
            انضم لآلاف المتعلمين العرب اللي اختاروا فاهم لتطوير مهاراتهم
          </p>
          <Button asChild size="lg">
            <Link href={ROUTES.signup}>
              اشترك دلوقتي
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// ====================================================================
// SUB-COMPONENTS
// ====================================================================

async function Header() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800/50 bg-ink/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={ROUTES.home} className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg shadow-lg shadow-brand-500/30">
            ف
          </div>
          <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-300">
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
                <Button asChild variant="ghost" size="sm">
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
      <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase text-brand-400 bg-brand-500/10 rounded-full">
        {label}
      </div>
      <h2 className="font-display text-3xl md:text-4xl font-extrabold mb-3">{title}</h2>
      <p className="text-ink-400">{subtitle}</p>
    </div>
  );
}

function CourseCard({ course }: { course: any }) {
  return (
    <Link
      href={ROUTES.course(course.slug)}
      className="group relative overflow-hidden rounded-2xl bg-ink-800/40 border border-ink-700/50 hover:border-brand-500/50 transition-all duration-300"
    >
      <div className="aspect-video bg-ink-900 relative overflow-hidden">
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail_url}
            alt={course.title_ar}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/20 to-ink-900">
            <BookOpen className="w-12 h-12 text-brand-500/40" />
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-brand-400 transition-colors">
          {course.title_ar}
        </h3>
        <div className="flex items-center gap-4 text-sm text-ink-400">
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
          ? 'bg-gradient-to-br from-brand-500/10 to-ink-800/40 border-brand-500/50 shadow-2xl shadow-brand-500/10'
          : 'bg-ink-800/40 border-ink-700/50'
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
        <span className="text-ink-400">/ {plan.interval === 'month' ? 'شهر' : 'سنة'}</span>
      </div>

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
            <span className="text-ink-200">{feature}</span>
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
    <footer className="relative border-t border-ink-800/50 bg-ink-900">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-display font-extrabold text-white">
                ف
              </div>
              <span className="font-display font-extrabold text-lg">{APP_NAME}</span>
            </div>
            <p className="text-sm text-ink-400">
              منصة تعليمية بالاشتراك للمحتوى العربي
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-sm">المنصة</h4>
            <ul className="space-y-2 text-sm text-ink-400">
              <li><Link href={ROUTES.courses} className="hover:text-brand-400">الكورسات</Link></li>
              <li><Link href={ROUTES.pricing} className="hover:text-brand-400">الأسعار</Link></li>
              <li><Link href="/instructors" className="hover:text-brand-400">المدرّبين</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-sm">الدعم</h4>
            <ul className="space-y-2 text-sm text-ink-400">
              <li><Link href="/help" className="hover:text-brand-400">مركز المساعدة</Link></li>
              <li><Link href="/contact" className="hover:text-brand-400">تواصل معنا</Link></li>
              <li><Link href="/faq" className="hover:text-brand-400">أسئلة شائعة</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-sm">قانوني</h4>
            <ul className="space-y-2 text-sm text-ink-400">
              <li><Link href="/terms" className="hover:text-brand-400">شروط الاستخدام</Link></li>
              <li><Link href="/privacy" className="hover:text-brand-400">سياسة الخصوصية</Link></li>
              <li><Link href="/refund" className="hover:text-brand-400">سياسة الاسترداد</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-ink-800 text-center text-sm text-ink-500">
          © {new Date().getFullYear()} {APP_NAME} — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}
