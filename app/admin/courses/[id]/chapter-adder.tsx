'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Video,
  HelpCircle,
  Paperclip,
  Upload,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { createLesson } from './actions';
import { createQuiz } from './quizzes/actions';

type ChapterLesson = { id: string; title_ar: string };

/**
 * Per-chapter "add to this section" footer. Three tabs:
 *   1. درس     → existing createLesson server action (Bunny/Vimeo)
 *   2. كويز    → existing createQuiz server action; admin picks which
 *                 lesson it attaches to (or course-level), set pass
 *                 score, then jumps straight into the quiz editor
 *   3. مرفق   → uploads via /api/admin/lessons/[id]/attachments after
 *                 admin picks the target lesson; supports file or link
 *
 * All actions are existing — this is purely a UI consolidation so the
 * admin doesn't have to navigate to three different forms per chapter.
 */
export function ChapterAdder({
  courseId,
  chapterId,
  chapterLessons,
}: {
  courseId: string;
  chapterId: string;
  chapterLessons: ChapterLesson[];
}) {
  const [tab, setTab] = useState<'lesson' | 'quiz' | 'attachment'>('lesson');

  return (
    <div className="p-4 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center gap-1 mb-3" role="tablist">
        <TabButton active={tab === 'lesson'} onClick={() => setTab('lesson')} icon={Video}>
          إضافة درس
        </TabButton>
        <TabButton active={tab === 'quiz'} onClick={() => setTab('quiz')} icon={HelpCircle}>
          إضافة كويز
        </TabButton>
        <TabButton
          active={tab === 'attachment'}
          onClick={() => setTab('attachment')}
          icon={Paperclip}
          disabled={chapterLessons.length === 0}
          disabledTitle="أضف درس أولاً عشان تقدر تربط مرفق بيه"
        >
          إضافة مرفق
        </TabButton>
      </div>

      {tab === 'lesson' && <LessonForm courseId={courseId} chapterId={chapterId} />}
      {tab === 'quiz' && (
        <QuizForm courseId={courseId} chapterLessons={chapterLessons} />
      )}
      {tab === 'attachment' && (
        <AttachmentForm chapterLessons={chapterLessons} courseId={courseId} />
      )}
    </div>
  );
}

// ============================================================================
// Tab button
// ============================================================================

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
  disabled,
  disabledTitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-brand-500 text-white shadow-sm'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-white' : ''}`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

// ============================================================================
// Lesson form (same shape as the old inline form)
// ============================================================================

function LessonForm({ courseId, chapterId }: { courseId: string; chapterId: string }) {
  return (
    <form action={createLesson} className="space-y-3">
      <input type="hidden" name="chapter_id" value={chapterId} />
      <input type="hidden" name="course_id" value={courseId} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input name="title_ar" placeholder="عنوان الدرس" required />
        <select
          name="video_provider"
          defaultValue="bunny"
          className="h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="bunny">Bunny Stream</option>
          <option value="vimeo">Vimeo</option>
        </select>
        <Input
          name="video_id"
          placeholder="GUID / Vimeo ID / رابط الفيديو الكامل"
          required
          dir="ltr"
          className="text-left"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
        <Input
          name="duration_sec"
          type="number"
          min="0"
          placeholder="المدة بالثواني (اختياري)"
          dir="ltr"
          className="text-left"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            name="is_free_preview"
            className="w-4 h-4 rounded accent-brand-500"
          />
          معاينة مجانية
        </label>
        <Button type="submit" size="sm">
          <Plus className="w-4 h-4" />
          إضافة درس
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Quiz form
// ============================================================================

function QuizForm({
  courseId,
  chapterLessons,
}: {
  courseId: string;
  chapterLessons: ChapterLesson[];
}) {
  return (
    <form action={createQuiz} className="space-y-3">
      <input type="hidden" name="course_id" value={courseId} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Input name="title_ar" placeholder="عنوان الكويز" required minLength={3} />
        <select
          name="lesson_id"
          defaultValue=""
          className="h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="">الكويز النهائي للكورس</option>
          {chapterLessons.length === 0 && (
            <option disabled>لا توجد دروس في هذا القسم</option>
          )}
          {chapterLessons.map((l) => (
            <option key={l.id} value={l.id}>
              مربوط بدرس: {l.title_ar}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <Input
          name="passing_score"
          type="number"
          min="0"
          max="100"
          defaultValue="70"
          placeholder="درجة النجاح %"
          dir="ltr"
          className="text-left"
        />
        <Input
          name="max_attempts"
          type="number"
          min="1"
          defaultValue="3"
          placeholder="عدد المحاولات"
          dir="ltr"
          className="text-left"
        />
        <Input
          name="time_limit_minutes"
          type="number"
          min="1"
          placeholder="المدة (دقائق)"
          dir="ltr"
          className="text-left"
        />
        <Button type="submit" size="sm">
          <Plus className="w-4 h-4" />
          إنشاء وإضافة أسئلة
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        بعد الحفظ، هتنتقل لصفحة الكويز لإضافة الأسئلة.
      </p>
    </form>
  );
}

// ============================================================================
// Attachment form — calls /api/admin/lessons/[id]/attachments
// ============================================================================

function AttachmentForm({
  courseId,
  chapterLessons,
}: {
  courseId: string;
  chapterLessons: ChapterLesson[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const lessonId = String(formData.get('lesson_id') || '');
    if (!lessonId) {
      setError('اختار درس لربط المرفق بيه');
      return;
    }
    formData.delete('lesson_id'); // route doesn't need it in body; uses URL
    formData.set('kind', mode);

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `فشل الرفع (${res.status})`);
      }
      (e.target as HTMLFormElement).reset();
      startTransition(() => {
        // Refresh server data so any "X مرفق" indicators update.
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الرفع');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select
          name="lesson_id"
          required
          className="h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            اختار الدرس
          </option>
          {chapterLessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title_ar}
            </option>
          ))}
        </select>
        <Input
          name="name"
          placeholder="الاسم المعروض للطالب"
          required
          minLength={2}
          maxLength={120}
        />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-lg text-sm font-medium ${
              mode === 'file'
                ? 'bg-brand-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            <Upload className="w-4 h-4" />
            ملف
          </button>
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-lg text-sm font-medium ${
              mode === 'link'
                ? 'bg-brand-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            رابط
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
        {mode === 'file' ? (
          <Input
            name="file"
            type="file"
            required
            accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv,.json,.tar,.gz"
            className="md:col-span-2 cursor-pointer file:me-3 file:px-3 file:h-8 file:rounded file:border-0 file:bg-brand-500 file:text-white file:text-xs file:cursor-pointer"
          />
        ) : (
          <Input
            name="url"
            type="url"
            placeholder="https://example.com/file.pdf"
            required
            dir="ltr"
            className="md:col-span-2 text-left"
          />
        )}
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري الرفع...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              إضافة المرفق
            </>
          )}
        </Button>
      </div>

      {mode === 'file' && (
        <p className="text-xs text-gray-500">
          الحد الأقصى 50MB. أنواع مسموحة: PDF, ZIP, DOC, XLS, صور، نص.
        </p>
      )}
      {error && (
        <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}
    </form>
  );
}
