import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDuration } from '@/lib/utils';
import { updateLesson, deleteAttachment } from './actions';
import { AttachmentUploader } from './attachment-uploader';
import {
  ArrowRight,
  Save,
  FileText,
  Link as LinkIcon,
  Trash2,
  ExternalLink,
  Video as VideoIcon,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const metadata = {
  title: 'تعديل الدرس — لوحة الإدارة',
  robots: { index: false, follow: false },
};

export default async function LessonDetailPage({
  params,
  searchParams,
}: {
  params: { id: string; lessonId: string };
  searchParams: { success?: string; error?: string };
}) {
  await requireAdmin();
  const service = createServiceClient();

  const [{ data: lesson }, { data: attachments }, { data: lessonQuiz }] = await Promise.all([
    service
      .from('lessons')
      .select(
        `
          id, title_ar, description_ar, video_provider, video_id, video_library_id,
          duration_sec, is_free_preview, course_id, chapter_id, sort_order,
          chapter:chapters(id, title_ar),
          course:courses(id, title_ar, slug)
        `
      )
      .eq('id', params.lessonId)
      .maybeSingle(),
    service
      .from('lesson_attachments')
      .select('*')
      .eq('lesson_id', params.lessonId)
      .order('created_at', { ascending: true }),
    service
      .from('quizzes')
      .select('id, title_ar, passing_score, max_attempts')
      .eq('lesson_id', params.lessonId)
      .maybeSingle(),
  ]);

  if (!lesson || lesson.course_id !== params.id) notFound();
  const course = Array.isArray(lesson.course) ? lesson.course[0] : lesson.course;
  const chapter = Array.isArray(lesson.chapter) ? lesson.chapter[0] : lesson.chapter;

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href={`/admin/courses/${params.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-foreground mb-4"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للكورس: {course?.title_ar}
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">{lesson.title_ar}</h1>
        <p className="text-sm text-gray-500 mt-1">
          القسم: {chapter?.title_ar || '—'} · ترتيب الدرس: {lesson.sort_order + 1}
        </p>
      </div>

      {searchParams.success && (
        <Banner kind="success">
          {{
            updated: 'تم حفظ الدرس.',
            attachment_removed: 'تم حذف المرفق.',
          }[searchParams.success] || 'تم.'}
        </Banner>
      )}
      {searchParams.error && (
        <Banner kind="error">{decodeURIComponent(searchParams.error)}</Banner>
      )}

      {/* Lesson form */}
      <form
        action={updateLesson}
        className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 space-y-5"
      >
        <input type="hidden" name="id" value={lesson.id} />
        <input type="hidden" name="course_id" value={lesson.course_id} />

        <div className="space-y-2">
          <Label htmlFor="title_ar">عنوان الدرس</Label>
          <Input
            id="title_ar"
            name="title_ar"
            defaultValue={lesson.title_ar}
            required
            minLength={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description_ar">وصف الدرس</Label>
          <textarea
            id="description_ar"
            name="description_ar"
            rows={4}
            defaultValue={lesson.description_ar || ''}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="شرح مختصر للدرس يظهر للطالب"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="video_provider">مزوّد الفيديو</Label>
            <select
              id="video_provider"
              name="video_provider"
              defaultValue={(lesson as any).video_provider || 'bunny'}
              className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="bunny">Bunny Stream</option>
              <option value="vimeo">Vimeo</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="video_id">GUID / ID / رابط الفيديو</Label>
            <Input
              id="video_id"
              name="video_id"
              defaultValue={(lesson as any).video_id || ''}
              placeholder="GUID أو رابط كامل (اتركه فاضي لإبقاء الفيديو الحالي)"
              dir="ltr"
              className="text-left"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="duration_sec">المدة بالثواني</Label>
            <Input
              id="duration_sec"
              name="duration_sec"
              type="number"
              min="0"
              defaultValue={lesson.duration_sec || 0}
              dir="ltr"
              className="text-left"
            />
            {lesson.duration_sec > 0 && (
              <p className="text-xs text-gray-500">≈ {formatDuration(lesson.duration_sec)}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>الإتاحة</Label>
            <label className="flex items-center gap-2 h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm">
              <input
                type="checkbox"
                name="is_free_preview"
                defaultChecked={lesson.is_free_preview}
                className="w-4 h-4 rounded accent-brand-500"
              />
              معاينة مجانية (متاحة بدون اشتراك)
            </label>
          </div>
        </div>

        <div>
          <Button type="submit">
            <Save className="w-4 h-4" />
            حفظ التغييرات
          </Button>
        </div>
      </form>

      {/* Attachments */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-500" />
            المرفقات
          </h2>
          <span className="text-xs text-gray-500">{attachments?.length || 0} مرفق</span>
        </div>

        {attachments && attachments.length > 0 ? (
          <ul className="space-y-2 mb-5">
            {attachments.map((a: any) => (
              <li
                key={a.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50"
              >
                {a.kind === 'link' ? (
                  <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{a.file_name_ar}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    {a.kind === 'link' ? (
                      <span dir="ltr" className="truncate max-w-md">
                        {a.file_url}
                      </span>
                    ) : (
                      <>
                        <span className="uppercase">{a.file_type || 'file'}</span>
                        {a.file_size_kb && <span>· {Math.round(a.file_size_kb)} KB</span>}
                      </>
                    )}
                  </div>
                </div>
                {a.kind === 'link' && (
                  <a
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:text-brand-700 text-xs inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    فتح
                  </a>
                )}
                <form action={deleteAttachment} className="inline">
                  <input type="hidden" name="attachment_id" value={a.id} />
                  <input type="hidden" name="lesson_id" value={lesson.id} />
                  <input type="hidden" name="course_id" value={lesson.course_id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 mb-5">لا توجد مرفقات. أضف ملفًا أو رابطًا أدناه.</p>
        )}

        <AttachmentUploader lessonId={lesson.id} courseId={lesson.course_id} />
      </section>

      {/* Quiz placeholder */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="font-bold">الكويز المربوط بالدرس</h2>
          <Link
            href={`/admin/courses/${params.id}/quizzes`}
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            إدارة كل كويزات الكورس →
          </Link>
        </div>
        {lessonQuiz ? (
          <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
            <div>
              <div className="font-medium">{lessonQuiz.title_ar}</div>
              <div className="text-xs text-emerald-700 mt-0.5">
                {lessonQuiz.passing_score}% للنجاح · {lessonQuiz.max_attempts} محاولات
              </div>
            </div>
            <Link
              href={`/admin/courses/${params.id}/quizzes/${lessonQuiz.id}`}
              className="text-emerald-700 hover:underline text-xs font-medium"
            >
              تعديل الكويز ←
            </Link>
          </div>
        ) : (
          <Link
            href={`/admin/courses/${params.id}/quizzes?for_lesson=${lesson.id}`}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-dashed border-gray-300 text-sm hover:bg-gray-50"
          >
            + إنشاء كويز لهذا الدرس
          </Link>
        )}
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
