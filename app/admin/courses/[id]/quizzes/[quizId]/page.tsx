import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateQuiz, addQuestion, deleteQuestion, generateQuestionsWithAI } from '../actions';
import { QuestionEditor } from './question-editor';
import {
  ArrowRight,
  Save,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Wand2,
} from 'lucide-react';

export const metadata = {
  title: 'تعديل الكويز — لوحة الإدارة',
  robots: { index: false, follow: false },
};

const TYPE_LABEL: Record<string, string> = {
  single_choice: 'اختيار واحد',
  multiple_choice: 'اختيار متعدد',
  true_false: 'صح / خطأ',
};

export default async function QuizEditorPage({
  params,
  searchParams,
}: {
  params: { id: string; quizId: string };
  searchParams: { success?: string; error?: string };
}) {
  await requireAdmin();
  const service = createServiceClient();

  const [{ data: course }, { data: quiz }, { data: questions }] = await Promise.all([
    service.from('courses').select('id, title_ar').eq('id', params.id).maybeSingle(),
    service
      .from('quizzes')
      .select('*, lesson:lessons(id, title_ar)')
      .eq('id', params.quizId)
      .maybeSingle(),
    service
      .from('quiz_questions')
      .select('id, question_ar, type, explanation_ar, sort_order, options:quiz_options(id, option_ar, is_correct, sort_order)')
      .eq('quiz_id', params.quizId)
      .order('sort_order'),
  ]);

  if (!course || !quiz || quiz.course_id !== params.id) notFound();
  const lesson = Array.isArray(quiz.lesson) ? quiz.lesson[0] : quiz.lesson;

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href={`/admin/courses/${params.id}/quizzes`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-foreground mb-4"
      >
        <ArrowRight className="w-4 h-4" />
        كل الكويزات
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <HelpCircle className="w-7 h-7 text-brand-500" />
          {quiz.title_ar}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {lesson?.title_ar ? `درس: ${lesson.title_ar}` : 'الكويز النهائي للكورس'} ·{' '}
          {questions?.length || 0} سؤال
        </p>
      </div>

      {searchParams.success && (
        <Banner kind="success">
          {searchParams.success === 'ai_generated'
            ? `تم توليد ${(searchParams as any).count || ''} سؤال بالذكاء الاصطناعي.`
            : ({
                updated: 'تم حفظ الإعدادات.',
                question_added: 'تم إضافة السؤال.',
                question_removed: 'تم حذف السؤال.',
              } as Record<string, string>)[searchParams.success] || 'تم.'}
        </Banner>
      )}
      {searchParams.error && (
        <Banner kind="error">{decodeURIComponent(searchParams.error)}</Banner>
      )}

      {/* Settings */}
      <form
        action={updateQuiz}
        className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 space-y-4"
      >
        <input type="hidden" name="id" value={quiz.id} />
        <input type="hidden" name="course_id" value={course.id} />

        <h2 className="font-bold">إعدادات الكويز</h2>

        <div className="space-y-2">
          <Label htmlFor="title_ar">العنوان</Label>
          <Input id="title_ar" name="title_ar" defaultValue={quiz.title_ar} required minLength={3} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description_ar">الوصف</Label>
          <textarea
            id="description_ar"
            name="description_ar"
            rows={2}
            defaultValue={quiz.description_ar || ''}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
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
              defaultValue={quiz.passing_score}
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
              defaultValue={quiz.max_attempts}
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
              defaultValue={quiz.time_limit_minutes ?? ''}
              placeholder="بدون حد"
              dir="ltr"
              className="text-left"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_required"
            defaultChecked={quiz.is_required}
            className="w-4 h-4 rounded accent-brand-500"
          />
          مطلوب لاجتياز الكورس
        </label>

        <div>
          <Button type="submit">
            <Save className="w-4 h-4" />
            حفظ الإعدادات
          </Button>
        </div>
      </form>

      {/* Questions list */}
      <section className="mb-6">
        <h2 className="font-bold mb-3">الأسئلة ({questions?.length || 0})</h2>
        {questions && questions.length > 0 ? (
          <ol className="space-y-3">
            {questions.map((q: any, idx: number) => {
              const opts = (q.options || []).slice().sort(
                (a: any, b: any) => a.sort_order - b.sort_order
              );
              return (
                <li
                  key={q.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium mb-1">
                        {idx + 1}. {q.question_ar}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">
                        {TYPE_LABEL[q.type] || q.type}
                      </span>
                    </div>
                    <form action={deleteQuestion}>
                      <input type="hidden" name="question_id" value={q.id} />
                      <input type="hidden" name="quiz_id" value={quiz.id} />
                      <input type="hidden" name="course_id" value={course.id} />
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
                  <ul className="space-y-1.5 text-sm">
                    {opts.map((o: any) => (
                      <li
                        key={o.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                          o.is_correct
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'border-gray-100 text-gray-700'
                        }`}
                      >
                        {o.is_correct ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span className="w-4 h-4 inline-block" />
                        )}
                        <span>{o.option_ar}</span>
                      </li>
                    ))}
                  </ul>
                  {q.explanation_ar && (
                    <p className="mt-3 text-xs text-gray-500 italic border-t pt-2">
                      شرح: {q.explanation_ar}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-gray-400 italic">
            لا توجد أسئلة بعد. أضف أول سؤال من النموذج أدناه.
          </p>
        )}
      </section>

      {/* AI generator */}
      <section className="bg-gradient-to-br from-brand-500/5 to-white border border-brand-500/30 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-brand-500" />
          <h2 className="font-bold">إنشاء أسئلة بالذكاء الاصطناعي</h2>
          <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 text-[10px] font-medium">
            Gemini
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          اكتب فقرة عن موضوع الكويز، اختار النوع والعدد، وهنُنشيء الأسئلة تلقائيًا
          ونضيفها للكويز.
        </p>

        <form action={generateQuestionsWithAI} className="space-y-3">
          <input type="hidden" name="quiz_id" value={quiz.id} />
          <input type="hidden" name="course_id" value={course.id} />

          <div className="space-y-2">
            <label htmlFor="topic" className="block text-sm font-medium">
              فقرة عن محتوى الكويز (الموضوع، المفاهيم الأساسية، أمثلة...)
            </label>
            <textarea
              id="topic"
              name="topic"
              rows={5}
              required
              minLength={10}
              maxLength={4000}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="مثال: الكويز ده عن أساسيات n8n: ما هو، كيف يختلف عن Zapier، المفاهيم الأساسية (workflow, node, trigger), وأبسط طريقة لإنشاء workflow يربط Webhook بـ Telegram. ركّز على المفاهيم النظرية والعملية للمبتدئين."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label htmlFor="question_type" className="block text-sm font-medium">
                نوع الأسئلة
              </label>
              <select
                id="question_type"
                name="question_type"
                defaultValue="single_choice"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
              >
                <option value="single_choice">اختيار واحد</option>
                <option value="multiple_choice">اختيار متعدد</option>
                <option value="true_false">صح / خطأ</option>
                <option value="mixed">منوّع</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="count" className="block text-sm font-medium">
                عدد الأسئلة
              </label>
              <input
                id="count"
                name="count"
                type="number"
                min="1"
                max="20"
                defaultValue="5"
                dir="ltr"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm text-left"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="difficulty" className="block text-sm font-medium">
                الصعوبة
              </label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue="medium"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
              >
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="hard">صعب</option>
                <option value="mixed">منوّع</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <p className="text-[11px] text-gray-400 max-w-md">
              ⚠ الذكاء الاصطناعي قد يخطئ. راجع الأسئلة المُنشأة وعدّل أو احذف ما
              يحتاج قبل نشر الكورس.
            </p>
            <Button type="submit" size="lg">
              <Wand2 className="w-4 h-4" />
              إنشاء الأسئلة
            </Button>
          </div>
        </form>
      </section>

      {/* Manual question form */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-bold mb-4">إضافة سؤال يدويًا</h2>
        <QuestionEditor quizId={quiz.id} courseId={course.id} />
      </section>
    </div>
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
