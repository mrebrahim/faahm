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
  createChapter,
  deleteChapter,
  deleteLesson,
  togglePreviewLesson,
} from './actions';
import { ChapterAdder } from './chapter-adder';

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
        <form action={updateCourse} className="rounded-2xl bg-white border border-gray-200 p-6 space-y-4">
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
            <Label htmlFor="thumbnail_url">رابط الصورة</Label>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            {sortedChapters.map((chapter: any, idx: number) => (
              <ChapterBlock
                key={chapter.id}
                chapter={chapter}
                index={idx}
                courseId={course.id}
              />
            ))}
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
function ChapterBlock({
  chapter,
  index,
  courseId,
}: {
  chapter: any;
  index: number;
  courseId: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
      {/* Chapter Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-600 flex items-center justify-center text-sm font-bold">
            {index + 1}
          </div>
          <div>
            <h3 className="font-bold">{chapter.title_ar}</h3>
            <p className="text-xs text-gray-500">{chapter.lessons?.length || 0} درس</p>
          </div>
        </div>

        <form action={deleteChapter}>
          <input type="hidden" name="id" value={chapter.id} />
          <input type="hidden" name="course_id" value={courseId} />
          <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Lessons */}
      {chapter.lessons && chapter.lessons.length > 0 && (
        <div className="divide-y divide-gray-200">
          {chapter.lessons.map((lesson: any, lessonIdx: number) => (
            <div key={lesson.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Video className="w-4 h-4 text-brand-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">
                    {lessonIdx + 1}. {lesson.title_ar}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                    <span dir="ltr" className="font-mono uppercase">
                      {(lesson.video_provider || 'bunny')}: {lesson.video_id || '—'}
                    </span>
                    {lesson.duration_sec > 0 && <span>{formatDuration(lesson.duration_sec)}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Edit (opens detail editor with attachments + quiz link) */}
                <Button asChild variant="ghost" size="sm" title="تعديل تفصيلي + مرفقات">
                  <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`}>
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </Link>
                </Button>

                {/* Toggle preview */}
                <form action={togglePreviewLesson}>
                  <input type="hidden" name="id" value={lesson.id} />
                  <input type="hidden" name="course_id" value={courseId} />
                  <input type="hidden" name="is_free_preview" value={lesson.is_free_preview.toString()} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    title={lesson.is_free_preview ? 'معاينة مجانية' : 'يتطلب اشتراك'}
                  >
                    {lesson.is_free_preview ? (
                      <Unlock className="w-4 h-4 text-brand-500" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </Button>
                </form>

                {/* Delete */}
                <form action={deleteLesson}>
                  <input type="hidden" name="id" value={lesson.id} />
                  <input type="hidden" name="course_id" value={courseId} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per-chapter add UI: lesson, quiz, or attachment in one tabbed footer. */}
      <ChapterAdder
        courseId={courseId}
        chapterId={chapter.id}
        chapterLessons={(chapter.lessons || []).map((l: any) => ({
          id: l.id,
          title_ar: l.title_ar,
        }))}
      />
    </div>
  );
}
