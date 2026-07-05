import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { applyPendingInvitesForCurrentUser } from '@/lib/invites';
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
  Shield,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Safety net: if the user arrived here via an invite that came back
  // through the implicit (hash) flow, our /auth/callback route couldn't
  // read the hash to materialise the subscription grant. Re-run here
  // so it lands on the first dashboard view. No-op when there's no
  // pending invite for this email.
  await applyPendingInvitesForCurrentUser();

  // Use service client to bypass any RLS issues when fetching own data
  // (Safe because we've already verified the user via auth.getUser())
  const service = createServiceClient();

  // Get profile
  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Force first-time invitees through /welcome so they choose a password.
  // Without this they'd have a working session today but couldn't log
  // back in tomorrow.
  if (profile && profile.password_set === false) {
    redirect('/welcome');
  }

  // Get active subscription
  const { data: subscription } = await service
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .maybeSingle();

  // Get user stats
  const { count: completedLessons } = await service
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_completed', true);

  const { count: certificatesCount } = await service
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Get featured courses (when courses exist)
  const { data: courses } = await service
    .from('courses')
    .select('id, slug, title_ar, thumbnail_url, total_lessons')
    .eq('is_published', true)
    .order('sort_order')
    .limit(6);

  const hasSubscription = !!subscription;
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href={ROUTES.dashboard} className="text-brand-600 font-medium">لوحتي</Link>
            <Link href={ROUTES.courses} className="text-gray-600 hover:text-foreground">الكورسات</Link>
            <Link href={ROUTES.certificates} className="text-gray-600 hover:text-foreground">الشهادات</Link>
          </nav>

          <div className="flex items-center gap-2">
            {/* Admin shortcut: only rendered when the logged-in user is an
                admin. Non-admins receive the same HTML without this link, so
                /admin existence is never leaked publicly. */}
            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
                <Link href={ROUTES.admin}>
                  <Shield className="w-4 h-4" />
                  لوحة الإدارة
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.settings}>
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
            <form action="/auth/signout" method="POST">
              <Button type="submit" variant="ghost" size="sm" title="تسجيل الخروج">
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">خروج</span>
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
          <p className="text-gray-500">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Subscription banner */}
        {!hasSubscription && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 to-brand-500/5 border border-brand-500/30">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg mb-1">ابدأ رحلة التعلّم الكاملة</h3>
                <p className="text-sm text-gray-600">
                  اشترك دلوقتي واحصل على وصول كامل لكل الكورسات بـ ~$3.33/شهر مع الباقة السنوية
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
            valueColor={hasSubscription ? 'text-brand-600' : 'text-gray-500'}
          />
          <StatCard
            icon={TrendingUp}
            label="الخطة"
            value={subscription?.plan === 'yearly' ? 'سنوي' : subscription?.plan === 'monthly' ? 'شهري' : '---'}
          />
        </div>

        {/* Subscription Details */}
        {hasSubscription && subscription && (
          <div className="mb-8 p-6 rounded-2xl bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-500" />
                تفاصيل الاشتراك
              </h3>
              <Button asChild variant="outline" size="sm">
                <Link href="/api/billing/portal">إدارة الاشتراك</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500 mb-1">الخطة</div>
                <div className="font-medium">{subscription.plan === 'yearly' ? 'سنوي ($40)' : 'شهري ($10)'}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">يتجدد في</div>
                <div className="font-medium">
                  {new Date(subscription.current_period_end).toLocaleDateString('ar-EG')}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">الحالة</div>
                <div className="font-medium text-brand-600">نشط</div>
              </div>
            </div>
          </div>
        )}

        {/* Security */}
        <div className="mb-8 p-6 rounded-2xl bg-white border border-gray-200">
          <h3 className="font-bold mb-3">الأمان</h3>
          <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
            <p className="text-gray-600 max-w-xl">
              لو خشيت إن حد دخل على حسابك من جهاز تاني، اضغط الزر ده عشان نسجّل
              خروجك من كل الأجهزة فورًا.
            </p>
            <form action="/auth/signout?scope=global" method="POST">
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="w-4 h-4" />
                تسجيل الخروج من كل الأجهزة
              </Button>
            </form>
          </div>
        </div>

        {/* Featured Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold">كورسات مختارة لك</h2>
            <Link href={ROUTES.courses} className="text-sm text-brand-600 hover:text-brand-600 flex items-center gap-1">
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
                  className="group rounded-xl bg-white border border-gray-200 hover:border-brand-500/50 overflow-hidden transition-all"
                >
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    {course.thumbnail_url ? (
                      <Image
                        src={course.thumbnail_url}
                        alt={course.title_ar}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                        className="object-cover"
                        quality={70}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-brand-500/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-1 line-clamp-2 group-hover:text-brand-600 transition-colors">
                      {course.title_ar}
                    </h3>
                    <p className="text-sm text-gray-500">{course.total_lessons} درس</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white border border-gray-200 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <h3 className="font-bold mb-2">لسه ما فيش كورسات</h3>
              <p className="text-sm text-gray-500 mb-4">الكورسات هتبان هنا أول ما الإدارة تنشرها</p>
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
    <div className="p-5 rounded-xl bg-white border border-gray-200">
      <Icon className="w-5 h-5 text-brand-500 mb-3" />
      <div className={`text-2xl font-bold mb-1 ${valueColor}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
