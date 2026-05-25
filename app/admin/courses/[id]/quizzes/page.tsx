import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createQuiz, deleteQuiz } from './actions';
import {
  ArrowRight,
  HelpCircle,
  Plus,
  Trash2,
  Pencil,
  Award,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const metadata = {
  title: 'كويزات الكورس — لوحة الإدارة',
  robots: { index: false, follow: false },
};

export default async function CourseQuizzesPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { success?: string; error?: string; for_lesson?: string };
}) {
  await requireAdmin();
  const service = createServiceClient();

  const [{ data: course }, { data: quizzes }, { data: lessons }] = await Promise.all([
    service.from('courses').select('id, title_ar, slug').eq('id', params.id).maybeSingle(),
    service
      .from('quizzes')
      .select(
        `
          id, title_ar, description_ar, passing_score, max_attempts,
          time_limit_minutes, is_required, lesson_id, created_at,
          lesson:lessons(title_ar),
          questions:quiz_questions(id)
        `
      )
      .eq('course_id', params.id)
      .order('created_at', { ascending: false }),
    service
      .from('lessons')
      .select('id, title_ar, sort_order, chapter_id, chapter:chapters(title_ar, sort_order)')
      .eq('course_id', params.id)
      .order('sort_order'),
  ]);

  if (!course) notFound();

  const courseQuizzes = (quizzes || []).filter((q: any) => !q.lesson_id);
  const lessonQuizzes = (quizzes || []).filter((q: any) => q.lesson_id);

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href={`/admin/courses/${params.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-foreground mb-4"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للكورس: {course.title_ar}
      </Link>

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-brand-500" />
            الكويزات
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            كل كويزات هذا الكورس — درس فرعي أو الكويز النهائي للشهادة.
          </p>
        </div>
      </div>

      {searchParams.success && (
        <Banner kind="success">
          {{
            deleted: 'تم حذف الكويز.',
            updated: 'تم حفظ الكويز.',
          }[searchParams.success] || 'تم.'}
        </Banner>
      )}
      {searchParams.error && (
        <Banner kind="error">{decodeURIComponent(searchParams.error)}</Banner>
      )}

      {/* Existing course-level quiz */}
      <section className="mb-8">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          الكويز النهائي للكورس
          <span className="text-xs font-normal text-gray-500">(يلزم لإصدار الشهادة)</span>
        </h2>
        {courseQuizzes.length > 0 ? (
          <ul className="space-y-2">
            {courseQuizzes.map((q: any) => (
              <QuizRow key={q.id} q={q} courseId={params.id} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 italic">لا يوجد كويز نهائي. أنشئ واحدًا أدناه.</p>
        )}
      </section>

      {/* Existing per-lesson quizzes */}
      <section className="mb-8">
        <h2 className="font-bold mb-3">كويزات الدروس</h2>
        {lessonQuizzes.length > 0 ? (
          <ul className="space-y-2">
            {lessonQuizzes.map((q: any) => (
              <QuizRow key={q.id} q={q} courseId={params.id} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 italic">لا توجد كويزات على مستوى الدروس.</p>
        )}
      </section>

      {/* Create new quiz */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-brand-500" />
          إنشاء كويز جديد
        </h2>
        <form action={createQuiz} className="space-y-4">
          <input type="hidden" name="course_id" value={course.id} />

          <div className="space-y-2">
            <Label htmlFor="title_ar">عنوان الكويز</Label>
            <Input
              id="title_ar"
              name="title_ar"
              required
              minLength={3}
              placeholder="مثال: امتحان القسم الأول"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson_id">مرتبط بـ</Label>
            <select
              id="lesson_id"
              name="lesson_id"
              defaultValue={searchParams.for_lesson || ''}
              className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="">الكورس كله (كويز نهائي)</option>
              {(lessons || []).map((l: any) => {
                const c = Array.isArray(l.chapter) ? l.chapter[0] : l.chapter;
                return (
                  <option key={l.id} value={l.id}>
                    {c?.title_ar ? `${c.title_ar} — ` : ''}
                    {l.title_ar}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="passing_score">درجة النجاح %</Label>
              <Input
                id="passing_score"
                name="passing_score"
                type="number"
                min="0"
                max="100"
                defaultValue="70"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_attempts">عدد المحاولات</Label>
              <Input
                id="max_attempts"
                name="max_attempts"
                type="number"
                min="1"
                defaultValue="3"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time_limit_minutes">المدة (دقائق)</Label>
              <Input
                id="time_limit_minutes"
                name="time_limit_minutes"
                type="number"
                min="1"
                placeholder="بدون حد"
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description_ar">الوصف (اختياري)</Label>
            <textarea
              id="description_ar"
              name="description_ar"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="تعليمات للطالب قبل بدء الكويز"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_required"
              className="w-4 h-4 rounded accent-brand-500"
            />
            مطلوب لاجتياز الكورس
          </label>

          <div>
            <Button type="submit">
              <Plus className="w-4 h-4" />
              إنشاء وإضافة أسئلة
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function QuizRow({ q, courseId }: { q: any; courseId: string }) {
  const lesson = Array.isArray(q.lesson) ? q.lesson[0] : q.lesson;
  const qCount = q.questions?.length || 0;

  return (
    <li className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white border border-gray-200 hover:border-brand-500/40">
      <div className="min-w-0">
        <div className="font-medium truncate">{q.title_ar}</div>
        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-3">
          {lesson?.title_ar && <span>درس: {lesson.title_ar}</span>}
          <span>{qCount} سؤال</span>
          <span>{q.passing_score}% للنجاح</span>
          <span>{q.max_attempts} محاولات</span>
          {q.time_limit_minutes && <span>{q.time_limit_minutes} دقيقة</span>}
          {q.is_required && (
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">مطلوب</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/courses/${courseId}/quizzes/${q.id}`}>
            <Pencil className="w-4 h-4" />
            تعديل
          </Link>
        </Button>
        <form action={deleteQuiz}>
          <input type="hidden" name="id" value={q.id} />
          <input type="hidden" name="course_id" value={courseId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </li>
  );
}

function Banner({
  kind,
  children,
}: {
  kind: 'success' | 'error';
  children: React.ReactNode;
}) {
  const cls =
    kind === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : 'bg-red-50 border-red-200 text-red-800';
  const Icon = kind === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`mb-4 p-3 rounded-lg border text-sm flex items-center gap-2 ${cls}`}>
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </div>
  );
}
