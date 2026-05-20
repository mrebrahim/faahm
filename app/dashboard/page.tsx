import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import {
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  LogOut,
  Settings,
  CreditCard,
  ArrowLeft,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .maybeSingle();

  // Get user stats
  const { count: completedLessons } = await supabase
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_completed', true);

  const { count: certificatesCount } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Get featured courses (when courses exist)
  const { data: courses } = await supabase
    .from('courses')
    .select('id, slug, title_ar, thumbnail_url, total_lessons')
    .eq('is_published', true)
    .order('sort_order')
    .limit(6);

  const isAdmin = profile?.role === 'admin';
  const hasSubscription = !!subscription;

  return (
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-ink-800/50 bg-ink/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href={ROUTES.dashboard} className="text-brand-400 font-medium">لوحتي</Link>
            <Link href={ROUTES.courses} className="text-ink-300 hover:text-foreground">الكورسات</Link>
            <Link href={ROUTES.certificates} className="text-ink-300 hover:text-foreground">الشهادات</Link>
            {isAdmin && (
              <Link href={ROUTES.admin} className="text-brand-400 hover:text-brand-300 font-medium">
                لوحة الإدارة
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.settings}>
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
            <form action="/auth/signout" method="POST">
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            أهلاً، <span className="text-gradient-brand">{profile?.full_name || 'يا متعلم'}</span> 👋
          </h1>
          <p className="text-ink-400">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Subscription banner */}
        {!hasSubscription && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 to-brand-500/5 border border-brand-500/30">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg mb-1">ابدأ رحلة التعلّم الكاملة</h3>
                <p className="text-sm text-ink-300">
                  اشترك دلوقتي واحصل على وصول كامل لكل الكورسات بـ $5/شهر
                </p>
              </div>
              <Button asChild>
                <Link href={ROUTES.pricing}>
                  اشترك دلوقتي
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={BookOpen}
            label="الدروس المُكتملة"
            value={completedLessons?.toString() || '0'}
          />
          <StatCard
            icon={Award}
            label="الشهادات"
            value={certificatesCount?.toString() || '0'}
          />
          <StatCard
            icon={Clock}
            label="الاشتراك"
            value={hasSubscription ? 'نشط' : 'غير نشط'}
            valueColor={hasSubscription ? 'text-brand-400' : 'text-ink-400'}
          />
          <StatCard
            icon={TrendingUp}
            label="الخطة"
            value={subscription?.plan === 'yearly' ? 'سنوي' : subscription?.plan === 'monthly' ? 'شهري' : '---'}
          />
        </div>

        {/* Subscription Details */}
        {hasSubscription && subscription && (
          <div className="mb-8 p-6 rounded-2xl bg-ink-800/40 border border-ink-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-500" />
                تفاصيل الاشتراك
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-ink-400 mb-1">الخطة</div>
                <div className="font-medium">{subscription.plan === 'yearly' ? 'سنوي ($40)' : 'شهري ($5)'}</div>
              </div>
              <div>
                <div className="text-ink-400 mb-1">يتجدد في</div>
                <div className="font-medium">
                  {new Date(subscription.current_period_end).toLocaleDateString('ar-EG')}
                </div>
              </div>
              <div>
                <div className="text-ink-400 mb-1">الحالة</div>
                <div className="font-medium text-brand-400">نشط</div>
              </div>
            </div>
          </div>
        )}

        {/* Featured Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold">كورسات مختارة لك</h2>
            <Link href={ROUTES.courses} className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          {courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={ROUTES.course(course.slug)}
                  className="group rounded-xl bg-ink-800/40 border border-ink-700/50 hover:border-brand-500/50 overflow-hidden transition-all"
                >
                  <div className="aspect-video bg-ink-900 relative overflow-hidden">
                    {course.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.thumbnail_url} alt={course.title_ar} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-brand-500/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-1 line-clamp-2 group-hover:text-brand-400 transition-colors">
                      {course.title_ar}
                    </h3>
                    <p className="text-sm text-ink-400">{course.total_lessons} درس</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-ink-800/40 border border-ink-700/50 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-ink-500" />
              <h3 className="font-bold mb-2">لسه ما فيش كورسات</h3>
              <p className="text-sm text-ink-400 mb-4">الكورسات هتبان هنا أول ما الإدارة تنشرها</p>
              {isAdmin && (
                <Button asChild size="sm">
                  <Link href="/admin/courses/new">أضف أول كورس</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  valueColor = 'text-foreground',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-ink-800/40 border border-ink-700/50">
      <Icon className="w-5 h-5 text-brand-500 mb-3" />
      <div className={`text-2xl font-bold mb-1 ${valueColor}`}>{value}</div>
      <div className="text-xs text-ink-400">{label}</div>
    </div>
  );
}
