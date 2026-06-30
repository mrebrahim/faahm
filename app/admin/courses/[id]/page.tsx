import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDuration } from '@/lib/utils';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Video,
  Lock,
  Unlock,
  BookOpen,
  Save,
  AlertCircle,
  CheckCircle2,
  Pencil,
  HelpCircle,
} from 'lucide-react';
import {
  updateCourse,
  togglePublishCourse,
  deleteCourse,
  reembedCourseKnowledge,
  createChapter,
  deleteChapter,
  deleteLesson,
  togglePreviewLesson,
} from './actions';
import { deleteQuiz } from './quizzes/actions';
import { ChapterAdder } from './chapter-adder';
import { ReorderableChapters } from './reorderable';

export const metadata = {
  title: 'تعديل كورس',
};

export default async function CourseEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
}) {
  const supabase = createServiceClient();

  // Fetch course with all related data
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!course) notFound();

  // Live chunk count — the admin needs to see whether the AI
  // assistant is actually ready or whether the last ingest failed.
  const { count: aiChunkCount } = await supabase
    .from('course_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', params.id);

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name_ar')
    .order('sort_order');

  const { data: chapters } = await supabase
    .from('chapters')
    .select(`
      id, title_ar, sort_order,
      lessons (id, title_ar, video_provider, video_id, video_library_id, duration_sec, sort_order, is_free_preview)
    `)
    .eq('course_id', params.id)
    .order('sort_order');

  // Quizzes attach to lessons (or float at the course level when
  // lesson_id is null). Fetch them all at once and bucket per lesson
  // so each lesson row can render its quizzes inline.
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, lesson_id, title_ar, is_required, passing_score, time_limit_minutes')
    .eq('course_id', params.id)
    .order('created_at');

  const quizzesByLesson = new Map<string, any[]>();
  const courseLevelQuizzes: any[] = [];
  for (const q of quizzes || []) {
    if (q.lesson_id) {
      const arr = quizzesByLesson.get(q.lesson_id) || [];
      arr.push(q);
      quizzesByLesson.set(q.lesson_id, arr);
    } else {
      courseLevelQuizzes.push(q);
    }
  }

  // Sort lessons within each chapter
  const sortedChapters = chapters?.map((ch: any) => ({
    ...ch,
    lessons: (ch.lessons || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  })) || [];

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/courses" className="text-sm text-brand-600 hover:text-brand-600 inline-flex items-center gap-1 mb-3">
          <ArrowRight className="w-4 h-4" />
          العودة لقائمة الكورسات
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl font-bold">{course.title_ar}</h1>
              {course.is_published ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-500/20 text-brand-600 text-xs">
                  <Eye className="w-3 h-3" /> منشور
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs">
                  <EyeOff className="w-3 h-3" /> مسودة
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              {course.total_lessons} درس • {formatDuration(course.total_duration_sec)}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild variant="outline">
              <Link href={`/admin/courses/${course.id}/quizzes`}>
                <HelpCircle className="w-4 h-4" />
                الكويزات
              </Link>
            </Button>
            <form action={togglePublishCourse}>
              <input type="hidden" name="id" value={course.id} />
              <input type="hidden" name="is_published" value={course.is_published.toString()} />
              <Button type="submit" variant={course.is_published ? 'outline' : 'default'}>
                {course.is_published ? (
                  <>
                    <EyeOff className="w-4 h-4" /> إخفاء
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" /> نشر الكورس
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {searchParams.error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {searchParams.error}
        </div>
      )}
      {searchParams.success && (
        <div className="mb-6 p-3 rounded-lg bg-brand-500/10 border border-brand-500/30 text-brand-600 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          تم الحفظ بنجاح
        </div>
      )}

      {/* Course Details Form */}
      <section className="mb-8">
        <h2 className="font-display text-xl font-bold mb-4">بيانات الكورس</h2>
        <form
          action={updateCourse}
          encType="multipart/form-data"
          className="rounded-2xl bg-white border border-gray-200 p-6 space-y-4"
        >
          <input type="hidden" name="id" value={course.id} />

          <div className="space-y-2">
            <Label htmlFor="title_ar">عنوان الكورس</Label>
            <Input id="title_ar" name="title_ar" defaultValue={course.title_ar} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description_ar">الوصف</Label>
            <textarea
              id="description_ar"
              name="description_ar"
              rows={4}
              defaultValue={course.description_ar || ''}
              className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">التصنيف</Label>
              <select
                id="category_id"
                name="category_id"
                defaultValue={course.category_id || ''}
                className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
              >
                <option value="">— بدون —</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">المستوى</Label>
              <select
                id="level"
                name="level"
                defaultValue={course.level}
                className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
              >
                <option value="beginner">مبتدئ</option>
                <option value="intermediate">متوسط</option>
                <option value="advanced">متقدّم</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>صورة الكورس</Label>
            {course.thumbnail_url && (
              <div className="mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={course.thumbnail_url}
                  alt=""
                  className="w-40 h-24 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}
            <Input
              id="thumbnail_file"
              name="thumbnail_file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500">
              ارفع صورة (JPG / PNG / WebP، حتى 5MB). أو ضع رابط مباشر في الحقل اللي تحت.
            </p>
            <Input
              id="thumbnail_url"
              name="thumbnail_url"
              type="url"
              defaultValue={course.thumbnail_url || ''}
              placeholder="https://..."
              dir="ltr"
              className="text-left"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rating_avg">متوسط التقييم (0–5)</Label>
              <Input
                id="rating_avg"
                name="rating_avg"
                type="number"
                min="0"
                max="5"
                step="0.1"
                defaultValue={course.rating_avg ?? 0}
                dir="ltr"
                className="text-left"
                placeholder="مثلًا 4.6"
              />
              <p className="text-[11px] text-gray-500">رقم يدوي مؤقت — هنستبدله بمتوسط حقيقي لما الـ reviews تنزل.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating_count">عدد التقييمات</Label>
              <Input
                id="rating_count"
                name="rating_count"
                type="number"
                min="0"
                step="1"
                defaultValue={course.rating_count ?? 0}
                dir="ltr"
                className="text-left"
                placeholder="مثلًا 706"
              />
              <p className="text-[11px] text-gray-500">0 = إخفاء النجوم من البطاقة.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="what_you_learn">اللي هيتعلّمه الطالب</Label>
              <textarea
                id="what_you_learn"
                name="what_you_learn"
                rows={6}
                defaultValue={(course.what_you_learn || []).join('\n')}
                placeholder={`نقطة في كل سطر، مثلًا:\nتركيب n8n محليًا وعلى السحابة\nبناء أول workflow من الصفر\nربط Telegram و Google Sheets بـ Webhook`}
                className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
              <p className="text-[11px] text-gray-500">سطر لكل نقطة. السطور الفاضية بتتجاهل.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="requirements">المتطلبات / الاستعداد</Label>
              <textarea
                id="requirements"
                name="requirements"
                rows={6}
                defaultValue={(course.requirements || []).join('\n')}
                placeholder={`نقطة في كل سطر، مثلًا:\nمعرفة أساسية بالإنترنت\nحاسوب فيه اتصال إنترنت\nمن غير خبرة برمجية`}
                className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
              <p className="text-[11px] text-gray-500">سطر لكل نقطة.</p>
            </div>
          </div>

          {/* AI Knowledge — the source-of-truth text the per-course
              chat assistant retrieves from. Save now runs the embed
              INLINE so the chunk count below is accurate as soon as
              the page reloads. If something fails the action throws
              and the admin sees the error in the URL bar. */}
          <div className="space-y-2 p-4 rounded-2xl border border-brand-500/30 bg-brand-500/5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label htmlFor="ai_knowledge" className="font-bold">
                🤖 معلومات المساعد الذكي (RAG)
              </Label>
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {/* Live chunk count — the source of truth on whether
                    the assistant will actually answer. 0 with non-
                    empty text == the last ingest failed; the admin
                    needs to click 'Re-prepare' below. */}
                {(course as any).ai_knowledge && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                      (aiChunkCount ?? 0) > 0
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {(aiChunkCount ?? 0) > 0 ? '✓' : '⚠️'} {aiChunkCount ?? 0} chunks
                  </span>
                )}
                {(course as any).ai_knowledge_updated_at && (
                  <span className="text-gray-500">
                    آخر تحديث:{' '}
                    {new Date(
                      (course as any).ai_knowledge_updated_at as string
                    ).toLocaleString('ar-EG')}
                  </span>
                )}
              </div>
            </div>
            <textarea
              id="ai_knowledge"
              name="ai_knowledge"
              rows={14}
              defaultValue={(course as any).ai_knowledge || ''}
              placeholder={`الصق هنا كل المعلومات اللي المساعد هيرد منها — ملخص، أسئلة شائعة، تعريفات، إلخ.\nمثال:\n\nالكورس بيشرح أساسيات n8n من الصفر…\n\nالأسئلة الشائعة:\n- إيه هو n8n؟ هو أداة أتمتة بدون كود…\n- ازاي أبدأ workflow؟ …`}
              className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-foreground leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <p className="text-[11px] text-gray-600 leading-relaxed flex-1">
                المساعد يرد <strong>فقط</strong> من النص ده. الحفظ بيعمل
                chunks + embeddings تلقائياً (يستغرق 5–30 ثانية). لو الـ
                chunks فوق = 0 رغم وجود نص، يبقى الـ embed فشل (تحقق من
                <code className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px]">OPENAI_API_KEY</code>
                في Coolify) ودوس الزر اللي على اليمين. الميزة للمشتركين{' '}
                <strong>السنويين فقط</strong>.
              </p>
              {/* Manual re-embed — useful when the admin needs to
                  re-run after fixing the OpenAI key without editing
                  the textarea. Posts to the existing /api/courses/
                  [id]/ingest endpoint which uses the saved
                  ai_knowledge as source. */}
              <form action={reembedCourseKnowledge} className="flex-shrink-0">
                <input type="hidden" name="id" value={params.id} />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold whitespace-nowrap"
                >
                  🔄 إعادة تحضير المساعد
                </button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label htmlFor="trailer_video_provider">مزوّد الفيديو التشويقي</Label>
              <select
                id="trailer_video_provider"
                name="trailer_video_provider"
                defaultValue={(course as any).trailer_video_provider || 'bunny'}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
              >
                <option value="bunny">Bunny Stream</option>
                <option value="vimeo">Vimeo</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="trailer_video_id">GUID / Vimeo ID / رابط الفيديو التشويقي</Label>
              <Input
                id="trailer_video_id"
                name="trailer_video_id"
                defaultValue={(course as any).trailer_video_id || ''}
                placeholder="GUID أو رابط كامل (اختياري)"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trailer_video_library_id">Bunny Library ID</Label>
              <Input
                id="trailer_video_library_id"
                name="trailer_video_library_id"
                defaultValue={(course as any).trailer_video_library_id || ''}
                placeholder="e.g. 672644"
                dir="ltr"
                className="text-left"
              />
              <p className="text-[10px] text-gray-500">
                لازم تحطه لو لصقت GUID فقط (مش رابط كامل).
              </p>
            </div>
          </div>

          <Button type="submit">
            <Save className="w-4 h-4" />
            حفظ التغييرات
          </Button>
        </form>
      </section>

      {/* Chapters & Lessons */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">الأقسام والدروس</h2>
        </div>

        {/* Add Chapter Form */}
        <form action={createChapter} className="mb-4 p-4 rounded-xl bg-white border border-gray-200 border-dashed flex gap-2">
          <input type="hidden" name="course_id" value={course.id} />
          <Input
            name="title_ar"
            placeholder="اسم القسم الجديد (مثلًا: المقدمة، الأساسيات)"
            required
            className="flex-1"
          />
          <Button type="submit" variant="outline">
            <Plus className="w-4 h-4" />
            قسم جديد
          </Button>
        </form>

        {/* Chapters List */}
        {sortedChapters.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-gray-200 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">لسه ما فيش أقسام. أضف القسم الأول من فوق.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <ReorderableChapters
              courseId={course.id}
              chapters={sortedChapters as any}
              quizzesByLesson={Object.fromEntries(quizzesByLesson)}
            />
            {courseLevelQuizzes.length > 0 && (
              <div className="rounded-2xl bg-white border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700">
                  <HelpCircle className="w-4 h-4 text-brand-500" />
                  كويزات عامة (مش مربوطة بدرس)
                </div>
                <div className="space-y-2">
                  {courseLevelQuizzes.map((q) => (
                    <QuizRow key={q.id} quiz={q} courseId={course.id} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="font-display text-xl font-bold mb-4 text-destructive">منطقة الخطر</h2>
        <form action={deleteCourse} className="p-6 rounded-2xl border border-destructive/30 bg-destructive/5">
          <input type="hidden" name="id" value={course.id} />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold mb-1">حذف الكورس نهائيًا</h3>
              <p className="text-sm text-gray-500">هيتمسح الكورس وكل دروسه ومسابقاته. الإجراء ده مفيش رجوع فيه.</p>
            </div>
            <Button type="submit" variant="destructive">
              <Trash2 className="w-4 h-4" />
              حذف الكورس
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

// ============================================================================
// ============================================================================
function QuizRow({ quiz, courseId }: { quiz: any; courseId: string }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-gray-200 bg-white text-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <HelpCircle className="w-4 h-4 text-brand-500 flex-shrink-0" />
        <span className="font-medium truncate">{quiz.title_ar}</span>
        {quiz.is_required && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 flex-shrink-0">
            إجباري
          </span>
        )}
        <span dir="ltr" className="text-[10px] text-gray-500 flex-shrink-0">
          نجاح: {quiz.passing_score}%
        </span>
        {quiz.time_limit_minutes && (
          <span dir="ltr" className="text-[10px] text-gray-500 flex-shrink-0">
            {quiz.time_limit_minutes} دقيقة
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button asChild variant="ghost" size="sm" title="تعديل الكويز">
          <Link href={`/admin/courses/${courseId}/quizzes/${quiz.id}`}>
            <Pencil className="w-3.5 h-3.5 text-gray-500" />
          </Link>
        </Button>
        <form action={deleteQuiz}>
          <input type="hidden" name="id" value={quiz.id} />
          <input type="hidden" name="course_id" value={courseId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            title="حذف الكويز"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
