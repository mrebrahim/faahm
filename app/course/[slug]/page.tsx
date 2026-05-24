import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { formatDuration } from '@/lib/utils';
import { resolveVideoEmbed } from '@/lib/video';
import { hasActiveSubscription } from '@/lib/access';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Lock,
  Play,
  CheckCircle2,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدّم',
};

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

  // Course must be published (we use service to avoid relying solely on RLS for SEO pages).
  const { data: course } = await service
    .from('courses')
    .select(
      `
        id, slug, title_ar, description_ar, short_description_ar, thumbnail_url,
        trailer_video_provider, trailer_video_id, trailer_video_library_id,
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

  const subscribed = await hasActiveSubscription(user?.id);

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

  // Primary CTA destination
  let ctaHref: string;
  let ctaLabel: string;
  if (!user) {
    ctaHref = `${ROUTES.signup}?redirect=${encodeURIComponent(`/course/${course.slug}`)}`;
    ctaLabel = 'اشترك دلوقتي وابدأ';
  } else if (!subscribed) {
    ctaHref = ROUTES.pricing;
    ctaLabel = 'اشترك دلوقتي وابدأ';
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
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href={ROUTES.courses} className="text-gray-600 hover:text-foreground">الكورسات</Link>
            <Link href={ROUTES.pricing} className="text-gray-600 hover:text-foreground">الأسعار</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.dashboard}>لوحتي</Link>
              </Button>
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

      {/* HERO */}
      <section className="relative border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-10 max-w-6xl grid lg:grid-cols-5 gap-10 items-start">
          {/* Left: meta */}
          <div className="lg:col-span-3">
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

            <h1 className="font-display text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
              {course.title_ar}
            </h1>

            {course.short_description_ar && (
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                {course.short_description_ar}
              </p>
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
              <Button asChild size="lg" className="min-w-[200px]">
                <Link href={ctaHref}>
                  {subscribed && resumeLessonId ? null : <Play className="w-4 h-4" />}
                  {ctaLabel}
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              {!subscribed && firstPreviewLesson && user && (
                <Button asChild size="lg" variant="outline">
                  <Link href={ROUTES.lesson(firstPreviewLesson.id)}>
                    <Play className="w-4 h-4" />
                    شوف عينة مجانية
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Right: trailer / thumb */}
          <div className="lg:col-span-2 lg:sticky lg:top-24">
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
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.thumbnail_url}
                  alt={course.title_ar}
                  className="w-full h-full object-cover"
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

      {/* BODY: syllabus + sidebar */}
      <main className="container mx-auto px-4 py-12 max-w-6xl grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 space-y-10">
          {/* Description */}
          {course.description_ar && (
            <section>
              <h2 className="font-display text-2xl font-bold mb-4">نظرة عامة</h2>
              <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {course.description_ar}
              </div>
            </section>
          )}

          {/* Syllabus */}
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">المنهج</h2>
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
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-bold">{chapter.title_ar}</div>
                          <div className="text-xs text-gray-500">
                            {chapter.lessons?.length || 0} درس
                          </div>
                        </div>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
                    </summary>

                    {chapter.lessons && chapter.lessons.length > 0 && (
                      <ul className="divide-y divide-gray-100 border-t border-gray-100">
                        {chapter.lessons.map((lesson: any, lIdx: number) => {
                          const canAccess = subscribed || lesson.is_free_preview;
                          const Wrapper = canAccess && user ? Link : 'div';
                          const wrapperProps: any =
                            canAccess && user ? { href: ROUTES.lesson(lesson.id) } : {};
                          return (
                            <li key={lesson.id}>
                              <Wrapper
                                {...wrapperProps}
                                className={`flex items-center justify-between px-4 py-3 text-sm ${
                                  canAccess && user
                                    ? 'hover:bg-brand-500/5 hover:text-brand-600 cursor-pointer'
                                    : 'text-gray-500'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {canAccess ? (
                                    <Play className="w-4 h-4 text-brand-500 flex-shrink-0" />
                                  ) : (
                                    <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {lIdx + 1}. {lesson.title_ar}
                                  </span>
                                  {lesson.is_free_preview && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 flex-shrink-0">
                                      مجاني
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0 ms-3">
                                  {lesson.duration_sec > 0
                                    ? formatDuration(lesson.duration_sec)
                                    : ''}
                                </span>
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
              <h2 className="font-display text-2xl font-bold mb-4">المُحاضر</h2>
              <div className="p-6 rounded-2xl bg-white border border-gray-200 flex gap-4 items-start">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-500/10 flex-shrink-0 flex items-center justify-center">
                  {instructor.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={instructor.avatar_url}
                      alt={instructor.full_name_ar}
                      className="w-full h-full object-cover"
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
            <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-500/10 to-white border border-brand-500/30">
              <h3 className="font-display text-xl font-bold mb-2">
                اشترك واحصل على كل الكورسات
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                مفيش شراء كل كورس لوحده. اشتراك واحد بـ <strong>$5/شهر</strong> أو
                <strong> $40/سنة</strong> بيفتحلك كل المحتوى.
              </p>
              <ul className="space-y-2 mb-5 text-sm">
                {[
                  'وصول كامل لكل الكورسات',
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
                <Link href={user ? ROUTES.pricing : `${ROUTES.signup}?redirect=${encodeURIComponent(`/course/${course.slug}`)}`}>
                  {user ? 'اختار خطة الاشتراك' : 'ابدأ الآن'}
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          )}

          {subscribed && (
            <div className="p-6 rounded-2xl bg-white border border-gray-200">
              <div className="flex items-center gap-2 mb-3 text-sm text-brand-600 font-medium">
                <CheckCircle2 className="w-5 h-5" /> اشتراكك مفعّل
              </div>
              <p className="text-sm text-gray-600 mb-4">
                لك وصول كامل لكل دروس الكورس ده.
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
    </div>
  );
}
