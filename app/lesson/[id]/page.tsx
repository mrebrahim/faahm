import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { formatDuration } from '@/lib/utils';
import { resolveVideoEmbed } from '@/lib/video';
import { canAccessCourse } from '@/lib/access';
import { signLessonAttachment } from '@/lib/storage';
import { LessonPlayer } from './player';
import { CourseAiChat } from '@/components/course-ai-chat';
import { LessonCompleteBar, LessonNav } from './lesson-actions';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Play,
  Download,
  HelpCircle,
} from 'lucide-react';

export const metadata = {
  title: 'الدرس — فاهم!',
};

export default async function LessonPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const service = createServiceClient();

  // Anonymous visitors are allowed in — the page enforces access per-lesson
  // below so free-preview content shows even without a signup. Only the
  // paywall block + progress tracking are gated on `user`.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lesson } = await service
    .from('lessons')
    .select(
      `
        id, title_ar, description_ar, video_provider, video_id, video_library_id,
        duration_sec, is_free_preview, course_id, chapter_id, sort_order,
        attachments:lesson_attachments(id, file_name_ar, file_url, file_type, file_size_kb, storage_path, kind),
        course:courses(id, slug, title_ar, is_published)
      `
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!lesson) notFound();
  const course = Array.isArray(lesson.course) ? lesson.course[0] : lesson.course;
  if (!course || !course.is_published) notFound();

  // Three paths to access: free-preview lesson, or (for logged-in users)
  // an active subscription / per-course enrollment. canAccessCourse
  // returns false/false for null userId, so anonymous visitors only get
  // free-preview lessons.
  const { subscribed, enrolled } = user
    ? await canAccessCourse(user.id, lesson.course_id)
    : { subscribed: false, enrolled: false };
  const canAccess = subscribed || enrolled || lesson.is_free_preview;

  // AI chat gate. The chat panel is YEARLY-only per PRD — we surface
  // an 'upgrade' card to monthly subs and hide it entirely for guests.
  // The auth checked here is just for the visibility decision; the
  // /api/chat endpoint re-checks server-side before answering.
  let chatGate: 'none' | 'monthly' | 'yearly' = 'none';
  if (user) {
    const service = createServiceClient();
    const { data: planRow } = await service
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .gt('current_period_end', new Date().toISOString())
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();
    chatGate = planRow?.plan === 'yearly' ? 'yearly' : planRow ? 'monthly' : 'none';
  }

  // Stored attachments are in a private bucket — generate short-lived
  // signed URLs for any that don't have an external file_url already.
  // Done in parallel since each call hits Supabase Storage.
  if (canAccess && lesson.attachments && lesson.attachments.length > 0) {
    await Promise.all(
      lesson.attachments.map(async (att: any) => {
        if (att.storage_path) {
          att.file_url = (await signLessonAttachment(att.storage_path)) || att.file_url;
        }
      })
    );
  }

  // Resolve the actual embed URL from provider + id. We let the per-lesson
  // library_id override the project default so we can later split content
  // across multiple Bunny libraries (e.g. staging vs production).
  const embed = resolveVideoEmbed(
    (lesson as any).video_provider,
    (lesson as any).video_id,
    (lesson as any).video_library_id
  );

  // Course outline for sidebar (always fetched so we can show locked items too).
  const { data: chaptersRaw } = await service
    .from('chapters')
    .select(
      `
        id, title_ar, sort_order,
        lessons(id, title_ar, sort_order, duration_sec, is_free_preview)
      `
    )
    .eq('course_id', course.id)
    .order('sort_order');

  // Pull all quizzes for the course so we can render them inline in the
  // sidebar under the lesson they attach to. is_required is shown as a
  // small badge so students notice the mandatory ones.
  const { data: quizzesForCourse } = await service
    .from('quizzes')
    .select('id, lesson_id, title_ar, is_required')
    .eq('course_id', course.id)
    .order('created_at');

  const quizzesByLesson = new Map<string, any[]>();
  for (const q of quizzesForCourse || []) {
    if (!q.lesson_id) continue;
    const arr = quizzesByLesson.get(q.lesson_id) || [];
    arr.push(q);
    quizzesByLesson.set(q.lesson_id, arr);
  }

  const chapters = (chaptersRaw || [])
    .map((ch: any) => ({
      ...ch,
      lessons: (ch.lessons || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order),
    }))
    .sort((a: any, b: any) => a.sort_order - b.sort_order);

  const flatLessons = chapters.flatMap((ch: any) => ch.lessons || []);
  const currentIdx = flatLessons.findIndex((l: any) => l.id === lesson.id);
  const prevLesson = currentIdx > 0 ? flatLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx >= 0 && currentIdx < flatLessons.length - 1
    ? flatLessons[currentIdx + 1]
    : null;

  // Completed lessons set (for sidebar checkmarks). Empty for guests.
  const { data: progressRows } = user
    ? await service
        .from('progress')
        .select('lesson_id, is_completed')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
    : { data: null as any };

  const completed = new Set(
    (progressRows || []).filter((p: any) => p.is_completed).map((p: any) => p.lesson_id)
  );

  // Mark a quiz as "done" in the sidebar once the student has passed it
  // at least once. Failed attempts don't mark it complete. Skipped for
  // guests — they're not tracked.
  const { data: passedAttempts } = user
    ? await service
        .from('quiz_attempts')
        .select('quiz_id')
        .eq('user_id', user.id)
        .eq('is_passed', true)
        .in('quiz_id', (quizzesForCourse || []).map((q: any) => q.id) as any)
    : { data: null as any };
  const passedQuizzes = new Set((passedAttempts || []).map((a: any) => a.quiz_id));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={ROUTES.home} className="flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg">
                ف
              </div>
              <span className="font-display font-extrabold text-xl hidden sm:inline">
                {APP_NAME}
              </span>
            </Link>
            <span className="text-gray-300 hidden md:inline">/</span>
            <Link
              href={ROUTES.course(course.slug)}
              className="text-sm text-gray-600 hover:text-foreground truncate hidden md:block"
            >
              {course.title_ar}
            </Link>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {user ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.dashboard}>لوحتي</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
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

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-6">
        {/* Player + content */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6 min-w-0">
          {canAccess ? (
            embed ? (
              <LessonPlayer
                lessonId={lesson.id}
                embed={embed}
                provider={(lesson as any).video_provider || 'bunny'}
                title={lesson.title_ar}
                watermark={user ? (user.email ?? user.id.slice(0, 8)) : null}
              />
            ) : (
              <UnplayableBlock />
            )
          ) : (
            <PaywallBlock lessonId={lesson.id} loggedIn={!!user} />
          )}

          {canAccess && user && (
            <LessonCompleteBar
              lessonId={lesson.id}
              isCompleted={completed.has(lesson.id)}
            />
          )}

          <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <h1 className="font-display text-2xl md:text-3xl font-bold">{lesson.title_ar}</h1>
              {canAccess && completed.has(lesson.id) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-700">
                  <CheckCircle2 className="w-4 h-4" />
                  تم الإكمال
                </span>
              )}
            </div>

            {lesson.duration_sec > 0 && (
              <div className="text-sm text-gray-500 mb-4">
                المدة: {formatDuration(lesson.duration_sec)}
              </div>
            )}

            {lesson.description_ar && (
              <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                {lesson.description_ar}
              </div>
            )}

            {/* Quizzes attached to this lesson */}
            {canAccess && (() => {
              const lessonQuizzes = quizzesByLesson.get(lesson.id) || [];
              if (lessonQuizzes.length === 0) return null;
              return (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h2 className="font-bold mb-3 text-sm">كويزات الدرس</h2>
                  <ul className="space-y-2">
                    {lessonQuizzes.map((q) => {
                      const done = passedQuizzes.has(q.id);
                      return (
                        <li key={q.id}>
                          <Link
                            href={ROUTES.quiz(q.id)}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-brand-500/40 hover:bg-brand-500/5 transition-colors text-sm"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              {done ? (
                                <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
                              ) : (
                                <HelpCircle className="w-4 h-4 text-brand-500 flex-shrink-0" />
                              )}
                              <span className="truncate">{q.title_ar}</span>
                              {q.is_required && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 flex-shrink-0">
                                  إجباري
                                </span>
                              )}
                            </span>
                            <ArrowLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            {/* Attachments */}
            {canAccess && lesson.attachments && lesson.attachments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h2 className="font-bold mb-3 text-sm">الملفات المرفقة</h2>
                <ul className="space-y-2">
                  {lesson.attachments.map((att: any) => (
                    <li key={att.id}>
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-brand-500/40 hover:bg-brand-500/5 transition-colors text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-brand-500" />
                          {att.file_name_ar}
                        </span>
                        <span className="text-xs text-gray-400 uppercase">
                          {att.file_type}
                          {att.file_size_kb ? ` · ${Math.round(att.file_size_kb)}KB` : ''}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <LessonNav
            lessonId={lesson.id}
            // Treat guests as 'already complete' so the next button
            // navigates straight without prompting them to mark
            // something they can't track anyway.
            isCompleted={!user || completed.has(lesson.id)}
            prevHref={prevLesson ? ROUTES.lesson(prevLesson.id) : null}
            nextHref={nextLesson ? ROUTES.lesson(nextLesson.id) : null}
            nextTitle={nextLesson ? nextLesson.title_ar : null}
            courseHref={ROUTES.course(course.slug)}
          />
        </div>

        {/* Sidebar: chapter nav.
            Mobile: capped at ~60vh and scrolls inside, otherwise a
            multi-chapter syllabus dumps an endless block under the
            video and the prev/next buttons get pushed off screen.
            Desktop: sticky next to the player. */}
        <aside className="lg:col-span-3">
          <div className="lg:sticky lg:top-20 rounded-2xl bg-white border border-gray-200 overflow-hidden max-h-[60vh] lg:max-h-[calc(100vh-6rem)] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <Link
                href={ROUTES.course(course.slug)}
                className="block font-bold text-sm hover:text-brand-600 transition-colors truncate"
              >
                {course.title_ar}
              </Link>
              <div className="text-xs text-gray-500 mt-1">
                {completed.size} / {flatLessons.length} درس مكتمل
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {chapters.map((chapter: any, idx: number) => (
                <div key={chapter.id} className="border-b border-gray-100 last:border-b-0">
                  <div className="px-4 py-2.5 bg-gray-50 text-xs font-bold text-gray-600">
                    {idx + 1}. {chapter.title_ar}
                  </div>
                  <ul>
                    {chapter.lessons?.map((l: any, lIdx: number) => {
                      const isCurrent = l.id === lesson.id;
                      const isDone = completed.has(l.id);
                      // Locked = no subscription, no per-course enrollment for THIS course,
                      // and the lesson itself isn't a free preview.
                      const isLocked = !subscribed && !enrolled && !l.is_free_preview;
                      const lessonQuizzes = quizzesByLesson.get(l.id) || [];
                      return (
                        <li key={l.id}>
                          <Link
                            href={ROUTES.lesson(l.id)}
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm border-r-2 ${
                              isCurrent
                                ? 'bg-brand-500/10 border-brand-500 text-brand-700 font-medium'
                                : 'border-transparent hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span className="w-5 flex-shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-brand-500" />
                              ) : isLocked ? (
                                <Lock className="w-4 h-4 text-gray-300" />
                              ) : (
                                <Play className="w-4 h-4 text-gray-300" />
                              )}
                            </span>
                            <span className="flex-1 min-w-0 truncate">
                              {lIdx + 1}. {l.title_ar}
                            </span>
                            {l.duration_sec > 0 && (
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {Math.ceil(l.duration_sec / 60)}د
                              </span>
                            )}
                          </Link>

                          {/* Quizzes attached to this lesson */}
                          {lessonQuizzes.map((q) => {
                            const quizDone = passedQuizzes.has(q.id);
                            const quizLocked = !subscribed && !enrolled;
                            const Wrapper = quizLocked ? 'div' : Link;
                            const wrapperProps: any = quizLocked
                              ? {}
                              : { href: ROUTES.quiz(q.id) };
                            return (
                              <Wrapper
                                key={q.id}
                                {...wrapperProps}
                                className={`flex items-center gap-2.5 px-4 py-2 ps-10 text-xs border-r-2 border-transparent ${
                                  quizLocked
                                    ? 'text-gray-400 cursor-default'
                                    : 'hover:bg-gray-50 text-gray-600 cursor-pointer'
                                }`}
                              >
                                <span className="w-5 flex-shrink-0">
                                  {quizDone ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />
                                  ) : quizLocked ? (
                                    <Lock className="w-3.5 h-3.5 text-gray-300" />
                                  ) : (
                                    <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
                                  )}
                                </span>
                                <span className="flex-1 min-w-0 truncate">{q.title_ar}</span>
                                {q.is_required && (
                                  <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 flex-shrink-0">
                                    إجباري
                                  </span>
                                )}
                              </Wrapper>
                            );
                          })}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Per-course AI chat. Floating launcher bottom-left. Guests
          render nothing; monthly subs see an upgrade card inside;
          yearly subs get the full streaming RAG chat. Server-side
          /api/chat re-checks the gate before answering. */}
      <CourseAiChat
        gate={chatGate}
        courseId={course.id}
        courseTitle={course.title_ar}
        suggestions={[
          'لخّصلي الكورس في 3 نقاط',
          'ابدأ من أنهي درس؟',
          'إيه أهم حاجة في الكورس ده؟',
        ]}
      />
    </div>
  );
}

function UnplayableBlock() {
  return (
    <div className="aspect-video w-full rounded-2xl border border-gray-200 bg-gray-100 flex items-center justify-center p-8 text-center">
      <div>
        <div className="font-bold mb-1">الفيديو مش متاح حاليًا</div>
        <p className="text-sm text-gray-500">
          الإدارة محتاجة تضيف رابط الفيديو لهذا الدرس. حاول تاني بعد شوية.
        </p>
      </div>
    </div>
  );
}

function PaywallBlock({ lessonId, loggedIn }: { lessonId: string; loggedIn: boolean }) {
  // Logged-in but unsubscribed users see a subscribe CTA. Anonymous
  // visitors get the guest-checkout funnel (/personal-plan) — they
  // can pay before signing up, and the post-payment claim form
  // provisions the account from their email.
  const cta = loggedIn
    ? { href: ROUTES.pricing, label: 'اشترك دلوقتي' }
    : { href: '/personal-plan', label: 'احصل على خطتك الشخصية' };
  return (
    <div className="aspect-video w-full rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-2">
          {loggedIn ? 'الدرس ده للمشتركين فقط' : 'الدرس ده مش معاينة مجانية'}
        </h2>
        <p className="text-sm text-gray-300 mb-6">
          {loggedIn
            ? 'اشترك دلوقتي بـ ~12 ر.س/شهر سنوياً واحصل على كل دروس الكورس + كل كورسات فاهم!'
            : 'سجّل حساب مجاني عشان تشوف الدروس المجانية، أو اشترك للوصول الكامل.'}
        </p>
        <Button asChild size="lg" className="bg-white text-gray-900 hover:bg-gray-100 shadow-none">
          <Link href={cta.href}>
            {cta.label}
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
