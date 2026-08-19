import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { applyPendingInvitesForCurrentUser } from '@/lib/invites';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { pricingFor } from '@/lib/region';
import { listClaimableCourseIds } from '@/lib/cert-eligibility';
import { getUserXp, levelProgress } from '@/lib/xp';
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
  PlayCircle,
  Sparkles,
  Download,
  Flame,
  Trophy,
  Users,
  Zap,
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

  const xp = await getUserXp(user.id);
  const xpProgress = levelProgress(xp.total_xp);

  // Get featured courses (when courses exist)
  const { data: courses } = await service
    .from('courses')
    .select('id, slug, title_ar, thumbnail_url, total_lessons')
    .eq('is_published', true)
    .order('sort_order')
    .limit(6);

  // Get the user's per-course grants (coupon/promo enrollments etc).
  // A subscribed user already sees the whole catalog, so we only surface
  // the 'الكورسات بتاعتك' rail when they have à-la-carte access.
  const { data: enrollments } = await service
    .from('enrollments')
    .select(
      'id, course:course_id ( id, slug, title_ar, thumbnail_url, total_lessons )'
    )
    .eq('user_id', user.id)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('granted_at', { ascending: false });

  const myCourses = (enrollments || [])
    .map((e: any) => e.course)
    .filter(Boolean) as Array<{
    id: string;
    slug: string;
    title_ar: string;
    thumbnail_url: string | null;
    total_lessons: number;
  }>;

  // Issued certificates + any courses the user is eligible to claim
  // a cert for right now (finished all lessons + passed all quizzes).
  // Both feed the 'شهاداتي' rail below.
  const [{ data: issuedCerts }, claimableIds] = await Promise.all([
    service
      .from('certificates')
      .select('id, certificate_number, course_title, course_id, issued_at')
      .eq('user_id', user.id)
      .eq('is_revoked', false)
      .order('issued_at', { ascending: false })
      .limit(6),
    listClaimableCourseIds(user.id),
  ]);

  const { data: claimableCourses } = claimableIds.length
    ? await service
        .from('courses')
        .select('id, slug, title_ar')
        .in('id', claimableIds)
    : { data: [] as Array<{ id: string; slug: string; title_ar: string }> };

  const hasSubscription = !!subscription;
  const hasAnyAccess = hasSubscription || myCourses.length > 0;
  const isAdmin = profile?.role === 'admin';
  const pricing = pricingFor('us');
  const certs = issuedCerts || [];
  const claimable = claimableCourses || [];

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
            <Link href={ROUTES.certificates} className="text-gray-600 hover:text-foreground">شهاداتي</Link>
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
            أهلاً، <span className="text-gradient-brand">{profile?.full_name || 'يا طالب'}</span> 👋
          </h1>
          <p className="text-gray-500">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* XP + streak. Stacks under the welcome line on a phone and
            sits beside the community CTA from `sm:` up. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Zap className="w-4 h-4 text-brand-500" />
                  نقاطك
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-display text-4xl sm:text-5xl font-extrabold text-brand-600">
                    {xp.total_xp}
                  </span>
                  <span className="text-sm text-gray-500">XP</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 font-bold whitespace-nowrap">
                    مستوى {xpProgress.level}
                  </span>
                </div>
              </div>
              <div className="text-end flex-shrink-0">
                <div className="inline-flex items-center gap-1 text-orange-600 font-bold">
                  <Flame className="w-5 h-5" />
                  <span className="text-2xl sm:text-3xl">{xp.current_streak}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">يوم متواصل</p>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${xpProgress.percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {xpProgress.toNext > 0
                ? `فاضل ${xpProgress.toNext} نقطة توصل للمستوى ${xpProgress.level + 1}. كل درس بيديك 10 نقاط وكل امتحان بتنجح فيه 50.`
                : 'كل درس بيديك 10 نقاط وكل امتحان بتنجح فيه 50.'}
            </p>
          </div>

          <Link
            href="/community"
            className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 flex flex-col justify-between hover:border-brand-500/40 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Users className="w-4 h-4 text-brand-500" />
                الكوميونيتي
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                اسأل، شارك إنجازك، واتعلّم من باقي الطلبة.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 mt-4">
              <Trophy className="w-4 h-4" />
              ادخل دلوقتي
            </span>
          </Link>
        </div>

        {/* My courses — surfaced first for anyone with per-course grants
            (coupon / promo / manual enrollment). Skipped for subscribers
            because their access covers the whole catalog below already. */}
        {!hasSubscription && myCourses.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                <PlayCircle className="w-6 h-6 text-brand-500" />
                الكورسات بتاعتك
              </h2>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold">
                {myCourses.length} كورس مفتوح
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCourses.map((course) => (
                <Link
                  key={course.id}
                  href={ROUTES.course(course.slug)}
                  className="group rounded-xl bg-white border-2 border-brand-500/40 hover:border-brand-500 overflow-hidden transition-all shadow-sm hover:shadow-md"
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
                    <div className="absolute top-2 end-2 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      مفتوح
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold mb-1 line-clamp-2 group-hover:text-brand-600 transition-colors">
                      {course.title_ar}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {course.total_lessons} درس
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Subscription banner — hidden when the user already has any
            access (subscription OR per-course grant). Otherwise nudges
            them to unlock the rest of the catalog. */}
        {!hasAnyAccess && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 to-brand-500/5 border border-brand-500/30">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg mb-1">ابدأ رحلة التعلّم الكاملة</h3>
                <p className="text-sm text-gray-600">
                  اشترك دلوقتي واحصل على وصول كامل لكل الكورسات بـ ${pricing.yearlyAmount}/سنة (بدل ${pricing.yearlyAnchor} — خصم {pricing.savingsPct}% لفترة محدودة)
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

        {/* Upsell for users who redeemed a single-course coupon but
            don't yet have a full subscription — softer copy. */}
        {!hasSubscription && myCourses.length > 0 && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-white border border-amber-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold mb-1">افتح كل الكورسات — مش بس اللي معاك</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  بـ ${pricing.yearlyAmount}/سنة تفتحلك المنصة كلها + المساعد الذكي فاهم في كل درس.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.pricing}>
                  شوف الباقات
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
                <div className="font-medium">{subscription.plan === 'yearly' ? 'سنوي' : 'شهري'}</div>
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

        {/* My certificates rail — surfaces both issued certs and any
            courses the user is eligible to claim a cert for right now.
            Hidden entirely when neither list has anything to show, so
            new students don't see an empty section on day 1. */}
        {(certs.length > 0 || claimable.length > 0) && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-500" />
                شهاداتي
              </h2>
              <Link
                href="/certificates"
                className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                عرض الكل
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            {/* Claimable — a course the user has fully finished but hasn't
                pulled the certificate for yet. Golden card with a strong
                CTA so it's obvious it's something to act on. */}
            {claimable.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {claimable.map((c) => (
                  <Link
                    key={c.id}
                    href={`/certificate/claim/${c.slug}`}
                    className="group flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 hover:border-amber-500 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                        جاهزة للاستلام
                      </div>
                      <div className="font-bold text-sm truncate group-hover:text-amber-800">
                        {c.title_ar}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        اضغط عشان تصدر شهادتك
                      </div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-amber-500 group-hover:text-amber-700" />
                  </Link>
                ))}
              </div>
            )}

            {/* Issued — already claimed. Each links to the certificate
                page where the student can view / share / download it. */}
            {certs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certs.map((cert: any) => (
                  <Link
                    key={cert.id}
                    href={`/certificate/${cert.certificate_number}`}
                    className="group rounded-xl bg-white border border-gray-200 hover:border-brand-500/50 hover:shadow-md p-4 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm truncate group-hover:text-brand-600">
                          {cert.course_title}
                        </h3>
                        <code
                          dir="ltr"
                          className="text-[10px] font-mono text-gray-500 block mt-0.5"
                        >
                          {cert.certificate_number}
                        </code>
                        <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                          <span>
                            {new Date(cert.issued_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-gray-300 group-hover:text-brand-500 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Featured Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold">
              {hasSubscription ? 'كورسات مختارة لك' : 'كل الكورسات على فاهم'}
            </h2>
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
