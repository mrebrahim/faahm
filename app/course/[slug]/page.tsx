import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { MainNav } from '@/components/main-nav';
import { ROUTES } from '@/lib/constants';
import { pricingFor } from '@/lib/region';
import { formatDuration } from '@/lib/utils';
import { resolveVideoEmbed } from '@/lib/video';
import { canAccessCourse } from '@/lib/access';
import {
  productForCourseSlug,
  checkoutHrefFor,
  AI_BUNDLE,
  BUNDLE_ANCHOR_USD,
  BUNDLE_SAVINGS_USD,
} from '@/lib/catalog';
import { pickRelated, type RelatedCandidate } from '@/lib/related-courses';
import { CourseSocialProof } from '@/components/course-social-proof';
import { RelatedCourses } from '@/components/related-courses';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Lock,
  Play,
  CheckCircle2,
  Sparkles,
  Star,
  User as UserIcon,
} from 'lucide-react';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدّم',
};

// Always render fresh — admin edits to the course (trailer, thumbnail,
// chapters) need to show up immediately without waiting for a Next.js
// data-cache invalidation.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createServiceClient();
  const { data: course } = await supabase
    .from('courses')
    .select('title_ar, short_description_ar, thumbnail_url')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .maybeSingle();

  if (!course) return { title: 'كورس — فاهم!' };
  return {
    title: `${course.title_ar} — فاهم!`,
    description: course.short_description_ar || `تعلّم ${course.title_ar} على فاهم!`,
    openGraph: {
      title: course.title_ar,
      description: course.short_description_ar || '',
      images: course.thumbnail_url ? [course.thumbnail_url] : [],
    },
  };
}

export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  const pricing = pricingFor('us');

  // Cheap admin-role lookup so the shared MainNav can show the
  // 'لوحة الإدارة' shortcut to admins. Non-admins / guests get the
  // identical HTML they had before — no /admin link is leaked.
  let isAdmin = false;
  if (user) {
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  // Course must be published (we use service to avoid relying solely on RLS for SEO pages).
  const { data: course } = await service
    .from('courses')
    .select(
      `
        id, slug, title_ar, description_ar, short_description_ar, thumbnail_url,
        trailer_video_provider, trailer_video_id, trailer_video_library_id,
        what_you_learn, requirements, yearly_only,
        rating_avg, rating_count, category_id,
        level, total_lessons, total_duration_sec, language,
        category:categories(slug, name_ar),
        instructor:instructors(slug, full_name_ar, bio_ar, title_ar, avatar_url),
        chapters(id, title_ar, sort_order,
          lessons(id, title_ar, duration_sec, is_free_preview, sort_order)
        )
      `
    )
    .eq('slug', params.slug)
    .eq('is_published', true)
    .maybeSingle();

  if (!course) notFound();

  // Real social-proof counts. Two cheap parallel queries:
  //   - enrollments for *this* course (the '+392 طالب انضم
  //     لهذا الكورس' tile)
  //   - the related-courses pool (published catalog without the
  //     current course — pickRelated filters in JS)
  // Both run with the service client so no RLS in the way of
  // pure-catalog reads.
  const [enrollmentCountRes, relatedPoolRes] = await Promise.all([
    service
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course.id),
    service
      .from('courses')
      .select(
        'id, slug, title_ar, thumbnail_url, total_lessons, total_duration_sec, rating_avg, rating_count, category_id'
      )
      .eq('is_published', true),
  ]);
  const enrollmentCount = enrollmentCountRes.count ?? 0;
  const relatedPool = (relatedPoolRes.data ?? []) as RelatedCandidate[];
  const related = pickRelated(
    {
      id: course.id,
      slug: course.slug,
      title_ar: course.title_ar,
      thumbnail_url: course.thumbnail_url,
      total_lessons: course.total_lessons,
      total_duration_sec: course.total_duration_sec,
      rating_avg: (course as any).rating_avg ?? null,
      rating_count: (course as any).rating_count ?? null,
      category_id: (course as any).category_id ?? null,
    },
    relatedPool,
    4
  );

  const access = await canAccessCourse(user?.id, course.id);
  // Non-null only for n8n / AI Video / Vibe Coding — the courses no
  // subscription covers. Drives the paywall's whole shape below.
  const courseProduct = productForCourseSlug(course.slug);
  // For the rest of this page we treat enrollment the same as subscription —
  // both grant full access to *this* course.
  const subscribed = access.subscribed || access.enrolled;
  const enrolledOnly = !access.subscribed && access.enrolled;

  // Sort chapters + lessons
  const chapters = (course.chapters || [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((ch: any) => ({
      ...ch,
      lessons: (ch.lessons || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order),
    }));

  const firstLesson = chapters.flatMap((ch: any) => ch.lessons || [])[0];
  const firstPreviewLesson = chapters
    .flatMap((ch: any) => ch.lessons || [])
    .find((l: any) => l.is_free_preview);

  // Resume target for logged-in subscribers
  let resumeLessonId: string | null = null;
  if (user && subscribed) {
    const { data: lastProgress } = await service
      .from('progress')
      .select('lesson_id, is_completed')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .order('last_watched_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastProgress) {
      resumeLessonId = lastProgress.is_completed && firstLesson
        ? firstLesson.id // if last seen was completed, start fresh
        : lastProgress.lesson_id;
    }
  }

  const instructor = Array.isArray(course.instructor) ? course.instructor[0] : course.instructor;
  const category = Array.isArray(course.category) ? course.category[0] : course.category;

  // Resolve trailer embed (optional — falls through to thumbnail or placeholder).
  const trailerEmbed = (course as any).trailer_video_id
    ? resolveVideoEmbed(
        (course as any).trailer_video_provider,
        (course as any).trailer_video_id,
        (course as any).trailer_video_library_id
      )
    : null;

  // Primary CTA destination. For the general catalogue we point both
  // guest visitors AND signed-in-but-unsubscribed visitors at
  // /personal-plan + the same 'احصل على خطتك الشخصية' wording — the
  // marketing funnel converts better than the bare /pricing surface,
  // and one label across auth states keeps the page consistent.
  //
  // A sold-separately course is the exception: no subscription opens
  // it, so the CTA is the price and goes straight to checkout.
  let ctaHref: string;
  let ctaLabel: string;
  if (!subscribed && courseProduct) {
    ctaHref = checkoutHrefFor(courseProduct);
    ctaLabel = `اشتري الكورس بـ $${courseProduct.priceUsd}`;
  } else if (!subscribed) {
    ctaHref = '/personal-plan';
    ctaLabel = 'احصل على خطتك الشخصية';
  } else if (resumeLessonId) {
    ctaHref = ROUTES.lesson(resumeLessonId);
    ctaLabel = 'كمّل من اللي قبل';
  } else if (firstLesson) {
    ctaHref = ROUTES.lesson(firstLesson.id);
    ctaLabel = 'ابدأ الكورس';
  } else {
    ctaHref = ROUTES.courses;
    ctaLabel = 'لسه ما فيش دروس';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNav signedIn={!!user} isAdmin={isAdmin} />

      {/* HERO */}
      <section className="relative border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-6 sm:py-10 max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-start">
          {/* Left on desktop, BELOW the trailer on mobile — the visual
              hook lands first on phones, then the meta. */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
              {category && (
                <Link
                  href={`${ROUTES.courses}?category=${category.slug}`}
                  className="px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-700 font-medium hover:bg-brand-500/15"
                >
                  {category.name_ar}
                </Link>
              )}
              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                {LEVEL_LABELS[course.level] || course.level}
              </span>
              {firstPreviewLesson && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> فيه عينة مجانية
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl md:text-5xl font-extrabold mb-3 sm:mb-4 leading-tight">
              {course.title_ar}
            </h1>

            {course.short_description_ar && (
              <p className="text-base sm:text-lg text-gray-600 mb-5 sm:mb-6 leading-relaxed">
                {course.short_description_ar}
              </p>
            )}

            {/* Compact rating + enrollment row in the hero. The full
                CourseSocialProof block sits below the hero with the
                bigger visual treatment — this keeps the hero tight. */}
            {((course as any).rating_count > 0 || enrollmentCount > 0) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 text-sm">
                {(course as any).rating_count > 0 && (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span dir="ltr">
                      {Number((course as any).rating_avg).toFixed(1)}
                    </span>
                    <span className="text-gray-500 font-normal" dir="ltr">
                      ({(course as any).rating_count.toLocaleString('en-US')})
                    </span>
                  </span>
                )}
                {enrollmentCount > 0 && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <span className="font-bold text-foreground tabular-nums">
                        +{enrollmentCount.toLocaleString('en-US')}
                      </span>
                      <span className="text-gray-500">طالب انضم لهذا الكورس</span>
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-brand-500" />
                {course.total_lessons} درس
              </span>
              {course.total_duration_sec > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-500" />
                  {formatDuration(course.total_duration_sec)}
                </span>
              )}
              {instructor && (
                <span className="flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-brand-500" />
                  {instructor.full_name_ar}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="w-full sm:w-auto sm:min-w-[200px]">
                <Link href={ctaHref}>
                  {subscribed && resumeLessonId ? null : <Play className="w-4 h-4" />}
                  {ctaLabel}
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              {!subscribed && firstPreviewLesson && (
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href={ROUTES.lesson(firstPreviewLesson.id)}>
                    <Play className="w-4 h-4" />
                    شوف عينة مجانية
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Right on desktop, ABOVE the meta on mobile. */}
          <div className="lg:col-span-2 lg:sticky lg:top-24 order-1 lg:order-2">
            <div className="aspect-video rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
              {trailerEmbed?.kind === 'iframe' ? (
                <iframe
                  src={trailerEmbed.src}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  title={`عرض ${course.title_ar}`}
                />
              ) : trailerEmbed?.kind === 'native' ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={trailerEmbed.src} controls playsInline className="w-full h-full" />
              ) : course.thumbnail_url ? (
                <Image
                  src={course.thumbnail_url}
                  alt={course.title_ar}
                  fill
                  // The hero thumbnail can fill the column at any
                  // breakpoint, so a wide ladder is fine here.
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="object-cover"
                  quality={75}
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/20 to-gray-100">
                  <BookOpen className="w-16 h-16 text-brand-500/40" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Social proof — sits right under the hero so the first scroll
          past the headline lands on real numbers (rating + enrolled
          + platform). All counts are pulled live from the DB; no
          synthesized distribution bars (no per-user data yet). */}
      <section className="container mx-auto px-4 max-w-6xl py-6 sm:py-8">
        <CourseSocialProof
          ratingAvg={(course as any).rating_avg ?? null}
          ratingCount={(course as any).rating_count ?? null}
          enrollments={enrollmentCount}
        />
      </section>

      {/* BODY: syllabus + sidebar */}
      <main className="container mx-auto px-4 py-6 sm:py-12 max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10">
        <div className="lg:col-span-3 space-y-6 sm:space-y-10">
          {/* What you'll learn */}
          {(course as any).what_you_learn?.length > 0 && (
            <section className="p-5 sm:p-6 rounded-2xl bg-white border border-gray-200">
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-3 sm:mb-4">اللي هتتعلّمه</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {((course as any).what_you_learn as string[]).map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Requirements */}
          {(course as any).requirements?.length > 0 && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-3 sm:mb-4">المتطلبات</h2>
              <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
                {((course as any).requirements as string[]).map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Description. Plain text, not prose — Typography's prose can
              inject min-widths via its inline-code / pre rules that push
              the container past the viewport on phones. */}
          {course.description_ar && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-3 sm:mb-4">نظرة عامة</h2>
              <div className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line break-words">
                {course.description_ar}
              </div>
            </section>
          )}

          {/* Syllabus */}
          <section>
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-3 sm:mb-4">المنهج</h2>
            {chapters.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center text-sm text-gray-500">
                لسه ما فيش دروس مضافة للكورس ده
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.map((chapter: any, idx: number) => (
                  <details
                    key={chapter.id}
                    open={idx === 0}
                    className="group rounded-2xl bg-white border border-gray-200 overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none hover:bg-gray-50">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate">{chapter.title_ar}</div>
                          <div className="text-xs text-gray-500">
                            {chapter.lessons?.length || 0} درس
                          </div>
                        </div>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                    </summary>

                    {chapter.lessons && chapter.lessons.length > 0 && (
                      <ul className="divide-y divide-gray-100 border-t border-gray-100">
                        {chapter.lessons.map((lesson: any, lIdx: number) => {
                          const canAccess = subscribed || lesson.is_free_preview;
                          // Anyone can click a free-preview lesson; only
                          // subscribers/enrolled can click the rest.
                          const Wrapper = canAccess ? Link : 'div';
                          const wrapperProps: any = canAccess
                            ? { href: ROUTES.lesson(lesson.id) }
                            : {};
                          return (
                            <li key={lesson.id}>
                              <Wrapper
                                {...wrapperProps}
                                className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${
                                  canAccess
                                    ? 'hover:bg-brand-500/5 hover:text-brand-600 cursor-pointer'
                                    : 'text-gray-500'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {canAccess ? (
                                    <Play className="w-4 h-4 text-brand-500 flex-shrink-0" />
                                  ) : (
                                    <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  )}
                                  <span className="truncate min-w-0 flex-1">
                                    {lIdx + 1}. {lesson.title_ar}
                                  </span>
                                  {lesson.is_free_preview && (
                                    <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 flex-shrink-0">
                                      مجاني
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {lesson.is_free_preview && (
                                    <span className="hidden sm:inline text-xs text-brand-600 underline decoration-dotted underline-offset-2 font-medium">
                                      معاينة
                                    </span>
                                  )}
                                  {lesson.duration_sec > 0 && (
                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                      {formatDuration(lesson.duration_sec)}
                                    </span>
                                  )}
                                </div>
                              </Wrapper>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </details>
                ))}
              </div>
            )}
          </section>

          {/* Instructor */}
          {instructor && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-3 sm:mb-4">المُحاضر</h2>
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-gray-200 flex gap-4 items-start">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-500/10 flex-shrink-0 flex items-center justify-center">
                  {instructor.avatar_url ? (
                    <Image
                      src={instructor.avatar_url}
                      alt={instructor.full_name_ar}
                      fill
                      sizes="64px"
                      className="object-cover"
                      quality={75}
                    />
                  ) : (
                    <UserIcon className="w-7 h-7 text-brand-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold mb-0.5">{instructor.full_name_ar}</h3>
                  {instructor.title_ar && (
                    <div className="text-sm text-brand-600 mb-2">{instructor.title_ar}</div>
                  )}
                  {instructor.bio_ar && (
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                      {instructor.bio_ar}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right rail */}
        <aside className="lg:col-span-2 space-y-4">
          {!subscribed && (
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-brand-500/10 to-white border border-brand-500/30">
              {courseProduct ? (
                /* Sold on its own — a subscription doesn't open it, so
                   pitching one here would be a lie the buyer discovers
                   after paying. Show the real price instead. */
                <>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                    <Star className="w-3 h-3 fill-white" />
                    كورس بريميوم — بيتباع لوحده
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">
                    اشتري الكورس ده مرة واحدة
                  </h3>
                  <div className="mb-3">
                    <span
                      className="font-display text-4xl font-extrabold text-brand-700"
                      dir="ltr"
                    >
                      ${courseProduct.priceUsd}
                    </span>
                    <span className="text-sm text-gray-500 ms-2">مرة واحدة</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    الكورس ده مش داخل في الاشتراك الشهري ولا السنوي. بتدفع مرة
                    واحدة والوصول <strong>دايم</strong>.
                  </p>
                  <ul className="space-y-2 mb-5 text-sm">
                    {[
                      'وصول دائم — من غير تجديد',
                      'كل التحديثات المستقبلية مجاناً',
                      'شهادة إتمام',
                      'ضمان استرداد ٧ أيام',
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full" size="lg">
                    <Link href={checkoutHrefFor(courseProduct)}>
                      اشتري بـ ${courseProduct.priceUsd}
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                  </Button>
                  {/* The bundle is the better deal for anyone weighing a
                      second course — surfacing it here is where that
                      decision actually gets made. */}
                  <Link
                    href="/ai-bundle"
                    className="mt-3 block text-center text-xs text-gray-600 hover:text-brand-700 leading-relaxed"
                  >
                    أو خد التلات كورسات مع بعض بـ{' '}
                    <strong className="text-brand-700">${AI_BUNDLE.priceUsd}</strong> بدل $
                    {BUNDLE_ANCHOR_USD} — وفّر ${BUNDLE_SAVINGS_USD}
                  </Link>
                  {/* Most of the audience is in Egypt and doesn't hold a
                      card that works on Stripe. Without this the local
                      rail is invisible and the sale just doesn't happen. */}
                  <Link
                    href={`/offline/egp?product=${courseProduct.id}`}
                    className="mt-2 block text-center text-[11px] text-gray-500 hover:text-brand-700"
                  >
                    من مصر؟ ادفع بـ InstaPay أو Vodafone Cash ({courseProduct.priceEgp} ج.م)
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="font-display text-xl font-bold mb-2">
                    اشترك واحصل على كل الكورسات
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    اشتراك سنوي دلوقتي بـ{' '}
                    <strong>${pricing.yearlyAmount}/سنة</strong> (بدل ${pricing.yearlyAnchor} —
                    خصم {pricing.savingsPct}% لفترة محدودة) بيفتحلك كل كورسات المنصة + المساعد
                    الذكي + الشهادة.
                  </p>
                  <ul className="space-y-2 mb-5 text-sm">
                    {[
                      'وصول لكل كورسات الاشتراك',
                      'فيديوهات بجودة عالية',
                      'مسابقات وشهادات إتمام',
                      'إلغاء في أي وقت',
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full" size="lg">
                    <Link href="/personal-plan">
                      احصل على خطتك الشخصية
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}

          {subscribed && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-gray-200">
              <div className="flex items-center gap-2 mb-3 text-sm text-brand-600 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                {enrolledOnly ? 'تم تسجيلك في هذا الكورس' : 'اشتراكك مفعّل'}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {enrolledOnly
                  ? 'الإدارة منحتك وصولًا لهذا الكورس. استمتع!'
                  : 'لك وصول كامل لكل دروس الكورس ده.'}
              </p>
              {firstLesson && (
                <Button asChild className="w-full" size="lg">
                  <Link href={ROUTES.lesson(resumeLessonId || firstLesson.id)}>
                    {resumeLessonId ? 'كمّل من اللي قبل' : 'ابدأ الكورس'}
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </aside>
      </main>

      {/* Related courses — handpicked for the AI flagships
          (n8n/vibe-coding/ai-video/prompt-fundamentals/digital-teacher),
          category-fallback for everything else. Real DB data, every
          card clickable. */}
      <RelatedCourses courses={related} />
    </div>
  );
}
