import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { canAccessCourse } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { submitQuizAttempt } from './actions';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lock,
  HelpCircle,
  Clock,
  Trophy,
  AlertCircle,
} from 'lucide-react';

export const metadata = {
  title: 'كويز — فاهم!',
};

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { submitted?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/quiz/${params.id}`)}`);
  }

  const service = createServiceClient();

  // Fetch the quiz with all questions + options (sorted) and the
  // attached lesson/course so we can render breadcrumbs + back links.
  const { data: quiz } = await service
    .from('quizzes')
    .select(
      `
        id, course_id, lesson_id, title_ar, description_ar,
        passing_score, max_attempts, time_limit_minutes, is_required,
        course:courses(id, slug, title_ar, is_published),
        lesson:lessons(id, title_ar),
        questions:quiz_questions(
          id, question_ar, type, explanation_ar, sort_order,
          options:quiz_options(id, option_ar, is_correct, sort_order)
        )
      `
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!quiz) notFound();

  const course = Array.isArray(quiz.course) ? quiz.course[0] : quiz.course;
  const lesson = Array.isArray(quiz.lesson) ? quiz.lesson[0] : quiz.lesson;
  if (!course || !course.is_published) notFound();

  const access = await canAccessCourse(user.id, course.id);
  const canAccess = access.subscribed || access.enrolled;

  // Sort questions and their options deterministically (server-side
  // shuffling can come later — for now we honour the admin order).
  const questions = (quiz.questions || [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((q: any) => ({
      ...q,
      options: (q.options || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order),
    }));

  // Look up all attempts so we can show history and disable submit when
  // the user has run out of tries (or already passed).
  const { data: attempts } = await service
    .from('quiz_attempts')
    .select('id, score, is_passed, submitted_at')
    .eq('quiz_id', quiz.id)
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false });

  const submittedAttemptId = searchParams.submitted;
  const submittedAttempt = submittedAttemptId
    ? (attempts || []).find((a) => a.id === submittedAttemptId)
    : null;

  const attemptsUsed = attempts?.length || 0;
  const attemptsLeft = Math.max(0, (quiz.max_attempts ?? 3) - attemptsUsed);
  const hasPassed = (attempts || []).some((a) => a.is_passed);

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
          <Button asChild variant="ghost" size="sm">
            <Link href={lesson ? ROUTES.lesson(lesson.id) : ROUTES.course(course.slug)}>
              <ArrowLeft className="w-4 h-4" />
              العودة للدرس
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Intro card */}
        <div className="mb-6 p-6 rounded-2xl bg-white border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-brand-500" />
            <h1 className="font-display text-2xl font-bold">{quiz.title_ar}</h1>
            {quiz.is_required && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700">
                إجباري
              </span>
            )}
          </div>
          {quiz.description_ar && (
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">{quiz.description_ar}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              النجاح: {quiz.passing_score}%
            </span>
            <span className="inline-flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              {questions.length} سؤال
            </span>
            {quiz.time_limit_minutes && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {quiz.time_limit_minutes} دقيقة
              </span>
            )}
            <span dir="ltr">
              {attemptsUsed} / {quiz.max_attempts ?? 3} محاولات
            </span>
          </div>
        </div>

        {searchParams.error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {decodeURIComponent(searchParams.error)}
          </div>
        )}

        {!canAccess ? (
          <PaywallCard course={course} />
        ) : questions.length === 0 ? (
          <EmptyQuizCard />
        ) : submittedAttempt ? (
          <ResultView
            attempt={submittedAttempt}
            questions={questions}
            answers={
              ((attempts || []).find((a) => a.id === submittedAttemptId) as any)?.answers || {}
            }
            passingScore={quiz.passing_score ?? 70}
            lessonId={lesson?.id}
            courseSlug={course.slug}
            attemptsLeft={attemptsLeft}
            quizId={quiz.id}
          />
        ) : attemptsLeft === 0 ? (
          <ExhaustedCard
            attempts={attempts || []}
            passingScore={quiz.passing_score ?? 70}
            hasPassed={hasPassed}
            lessonId={lesson?.id}
            courseSlug={course.slug}
          />
        ) : (
          <form action={submitQuizAttempt} className="space-y-5">
            <input type="hidden" name="quiz_id" value={quiz.id} />
            {questions.map((q: any, idx: number) => (
              <QuestionCard key={q.id} question={q} index={idx} />
            ))}
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-gray-500">
                لما تخلّص، اضغط "إرسال" وهتشوف نتيجتك.
              </p>
              <Button type="submit" size="lg">
                إرسال الإجابات
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}

        {/* Attempt history */}
        {attempts && attempts.length > 0 && !submittedAttempt && (
          <section className="mt-8">
            <h2 className="font-bold text-sm mb-3">المحاولات السابقة</h2>
            <ul className="space-y-2">
              {attempts.map((a: any) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {a.is_passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span dir="ltr" className="font-bold">
                      {a.score}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(a.submitted_at).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <Link
                    href={`/quiz/${quiz.id}?submitted=${a.id}`}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    عرض النتيجة
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function QuestionCard({ question, index }: { question: any; index: number }) {
  const inputName = `q_${question.id}`;
  const isMulti = question.type === 'multiple_choice';
  return (
    <div className="p-5 rounded-2xl bg-white border border-gray-200">
      <div className="flex items-start gap-2 mb-4">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-500/10 text-brand-700 font-bold text-sm flex items-center justify-center">
          {index + 1}
        </span>
        <h3 className="font-bold leading-relaxed">{question.question_ar}</h3>
        {isMulti && (
          <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
            اختيار متعدد
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {question.options.map((opt: any) => (
          <li key={opt.id}>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-brand-500/40 hover:bg-brand-500/5 cursor-pointer transition-colors">
              <input
                type={isMulti ? 'checkbox' : 'radio'}
                name={inputName}
                value={opt.id}
                className="mt-1 accent-brand-500"
              />
              <span className="text-sm leading-relaxed">{opt.option_ar}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultView({
  attempt,
  questions,
  answers,
  passingScore,
  lessonId,
  courseSlug,
  attemptsLeft,
  quizId,
}: {
  attempt: any;
  questions: any[];
  answers: Record<string, string | string[]>;
  passingScore: number;
  lessonId?: string;
  courseSlug: string;
  attemptsLeft: number;
  quizId: string;
}) {
  return (
    <div className="space-y-5">
      <div
        className={`p-6 rounded-2xl border ${
          attempt.is_passed
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          {attempt.is_passed ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          ) : (
            <XCircle className="w-8 h-8 text-amber-500" />
          )}
          <div>
            <div className="font-display text-2xl font-bold">
              {attempt.is_passed ? 'نجحت! 🎉' : 'لسه محتاج شوية مذاكرة'}
            </div>
            <div className="text-sm text-gray-600">
              نتيجتك:{' '}
              <span dir="ltr" className="font-bold">
                {attempt.score}%
              </span>{' '}
              (مطلوب {passingScore}% للنجاح)
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q: any, idx: number) => {
          const userAnswer = answers[q.id];
          const userSet = new Set<string>(
            Array.isArray(userAnswer) ? userAnswer : userAnswer ? [userAnswer] : []
          );
          const correctSet = new Set(
            q.options.filter((o: any) => o.is_correct).map((o: any) => o.id)
          );
          const isCorrect =
            userSet.size === correctSet.size &&
            [...userSet].every((id) => correctSet.has(id));
          return (
            <div
              key={q.id}
              className={`p-5 rounded-2xl bg-white border ${
                isCorrect ? 'border-emerald-200' : 'border-rose-200'
              }`}
            >
              <div className="flex items-start gap-2 mb-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-500/10 text-brand-700 font-bold text-sm flex items-center justify-center">
                  {idx + 1}
                </span>
                <h3 className="font-bold leading-relaxed flex-1">{q.question_ar}</h3>
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                )}
              </div>
              <ul className="space-y-1.5">
                {q.options.map((opt: any) => {
                  const wasSelected = userSet.has(opt.id);
                  const isRight = opt.is_correct;
                  return (
                    <li
                      key={opt.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                        isRight
                          ? 'bg-emerald-50 text-emerald-900'
                          : wasSelected
                            ? 'bg-rose-50 text-rose-900'
                            : 'text-gray-600'
                      }`}
                    >
                      {isRight ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : wasSelected ? (
                        <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />
                      )}
                      <span className="flex-1">{opt.option_ar}</span>
                      {wasSelected && (
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                          اختيارك
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {q.explanation_ar && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 leading-relaxed">
                  <span className="font-bold">شرح: </span>
                  {q.explanation_ar}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {lessonId ? (
          <Button asChild variant="outline">
            <Link href={ROUTES.lesson(lessonId)}>
              <ArrowRight className="w-4 h-4" />
              ارجع للدرس
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={ROUTES.course(courseSlug)}>
              <ArrowRight className="w-4 h-4" />
              ارجع للكورس
            </Link>
          </Button>
        )}
        {!attempt.is_passed && attemptsLeft > 0 && (
          <Button asChild>
            <Link href={`/quiz/${quizId}`}>
              حاول تاني ({attemptsLeft} متبقية)
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyQuizCard() {
  return (
    <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center">
      <HelpCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
      <p className="text-sm text-gray-500">
        الكويز ده لسه ما فيهوش أسئلة. الإدارة هتضيف الأسئلة قريب.
      </p>
    </div>
  );
}

function ExhaustedCard({
  attempts,
  passingScore,
  hasPassed,
  lessonId,
  courseSlug,
}: {
  attempts: any[];
  passingScore: number;
  hasPassed: boolean;
  lessonId?: string;
  courseSlug: string;
}) {
  const best = attempts.reduce((a, b) => (a.score >= b.score ? a : b));
  return (
    <div className="p-6 rounded-2xl bg-white border border-gray-200 text-center space-y-3">
      <Lock className="w-10 h-10 mx-auto text-gray-400" />
      <p className="font-bold">
        {hasPassed ? 'نجحت في الكويز ده 🎉' : 'استنفدت كل المحاولات'}
      </p>
      <p className="text-sm text-gray-500">
        أفضل نتيجة:{' '}
        <span dir="ltr" className="font-bold">
          {best.score}%
        </span>{' '}
        (مطلوب {passingScore}%)
      </p>
      {lessonId ? (
        <Button asChild variant="outline">
          <Link href={ROUTES.lesson(lessonId)}>
            <ArrowRight className="w-4 h-4" />
            ارجع للدرس
          </Link>
        </Button>
      ) : (
        <Button asChild variant="outline">
          <Link href={ROUTES.course(courseSlug)}>
            <ArrowRight className="w-4 h-4" />
            ارجع للكورس
          </Link>
        </Button>
      )}
    </div>
  );
}

function PaywallCard({ course }: { course: { slug: string } }) {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 text-white text-center">
      <Lock className="w-10 h-10 mx-auto mb-3 opacity-80" />
      <h2 className="font-display text-xl font-bold mb-2">الكويز ده للمشتركين فقط</h2>
      <p className="text-sm text-gray-300 mb-4">
        اشترك وافتحلك كورسات الاشتراك والكويزات.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button asChild className="bg-white text-gray-900 hover:bg-gray-100 shadow-none">
          <Link href={ROUTES.pricing}>اشترك دلوقتي</Link>
        </Button>
        <Button asChild variant="ghost" className="text-white hover:bg-white/10">
          <Link href={ROUTES.course(course.slug)}>ارجع للكورس</Link>
        </Button>
      </div>
    </div>
  );
}
