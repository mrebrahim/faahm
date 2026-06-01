'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  GripVertical,
  Video,
  Lock,
  Unlock,
  Pencil,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/utils';
import {
  deleteChapter,
  deleteLesson,
  togglePreviewLesson,
  reorderChapters,
  reorderLessons,
} from './actions';
import { ChapterAdder } from './chapter-adder';

type Lesson = {
  id: string;
  title_ar: string;
  sort_order: number;
  duration_sec: number;
  video_provider: string | null;
  video_id: string | null;
  is_free_preview: boolean;
};

type Chapter = {
  id: string;
  title_ar: string;
  sort_order: number;
  lessons: Lesson[];
};

type Quiz = {
  id: string;
  lesson_id: string | null;
  title_ar: string;
  is_required: boolean;
  passing_score: number;
  time_limit_minutes: number | null;
};

/**
 * useReorder: minimal HTML5 drag-and-drop list state. Keeps the visible
 * order in React state (so the UI updates on drop without waiting for a
 * server round trip) and calls `onCommit` with the new id order so the
 * caller can persist it.
 */
function useReorder<T extends { id: string }>(
  initial: T[],
  onCommit: (ids: string[]) => void
) {
  const [items, setItems] = useState(initial);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onDragStart(id: string) {
    return (e: React.DragEvent) => {
      setDraggedId(id);
      e.dataTransfer.effectAllowed = 'move';
      // Some browsers refuse to start a drag without a non-empty payload.
      e.dataTransfer.setData('text/plain', id);
    };
  }
  function onDragOver(id: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (id !== overId) setOverId(id);
    };
  }
  function onDrop(id: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggedId || draggedId === id) {
        setDraggedId(null);
        setOverId(null);
        return;
      }
      const next = items.slice();
      const fromIdx = next.findIndex((i) => i.id === draggedId);
      const toIdx = next.findIndex((i) => i.id === id);
      if (fromIdx === -1 || toIdx === -1) return;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      setItems(next);
      setDraggedId(null);
      setOverId(null);
      startTransition(() => onCommit(next.map((n) => n.id)));
    };
  }
  function onDragEnd() {
    setDraggedId(null);
    setOverId(null);
  }

  return { items, draggedId, overId, onDragStart, onDragOver, onDrop, onDragEnd };
}

export function ReorderableChapters({
  courseId,
  chapters,
  quizzesByLesson,
}: {
  courseId: string;
  chapters: Chapter[];
  quizzesByLesson: Record<string, Quiz[]>;
}) {
  const ch = useReorder(chapters, (ids) => {
    const fd = new FormData();
    fd.set('course_id', courseId);
    fd.set('ids', ids.join(','));
    void reorderChapters(fd);
  });

  return (
    <div className="space-y-3">
      {ch.items.map((chapter, idx) => (
        <div
          key={chapter.id}
          draggable
          onDragStart={ch.onDragStart(chapter.id)}
          onDragOver={ch.onDragOver(chapter.id)}
          onDrop={ch.onDrop(chapter.id)}
          onDragEnd={ch.onDragEnd}
          className={`rounded-2xl bg-white border overflow-hidden transition-colors ${
            ch.overId === chapter.id && ch.draggedId !== chapter.id
              ? 'border-brand-500 ring-2 ring-brand-500/20'
              : 'border-gray-200'
          } ${ch.draggedId === chapter.id ? 'opacity-50' : ''}`}
        >
          <div className="flex items-stretch bg-gray-50 border-b border-gray-200">
            <div
              className="flex items-center px-2 cursor-grab active:cursor-grabbing hover:bg-gray-100 border-l border-gray-200"
              title="اسحب لتغيير ترتيب القسم"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-600 flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="font-bold">{chapter.title_ar}</h3>
                  <p className="text-xs text-gray-500">
                    {chapter.lessons?.length || 0} درس
                  </p>
                </div>
              </div>

              <form action={deleteChapter}>
                <input type="hidden" name="id" value={chapter.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>

          {chapter.lessons && chapter.lessons.length > 0 && (
            <ReorderableLessons
              courseId={courseId}
              chapterId={chapter.id}
              lessons={chapter.lessons}
              quizzesByLesson={quizzesByLesson}
            />
          )}

          <ChapterAdder
            courseId={courseId}
            chapterId={chapter.id}
            chapterLessons={(chapter.lessons || []).map((l) => ({
              id: l.id,
              title_ar: l.title_ar,
            }))}
          />
        </div>
      ))}
    </div>
  );
}

function ReorderableLessons({
  courseId,
  chapterId,
  lessons,
  quizzesByLesson,
}: {
  courseId: string;
  chapterId: string;
  lessons: Lesson[];
  quizzesByLesson: Record<string, Quiz[]>;
}) {
  const ls = useReorder(lessons, (ids) => {
    const fd = new FormData();
    fd.set('course_id', courseId);
    fd.set('chapter_id', chapterId);
    fd.set('ids', ids.join(','));
    void reorderLessons(fd);
  });

  return (
    <div className="divide-y divide-gray-200">
      {ls.items.map((lesson, lessonIdx) => {
        const lessonQuizzes = quizzesByLesson[lesson.id] || [];
        return (
          <div
            key={lesson.id}
            draggable
            onDragStart={ls.onDragStart(lesson.id)}
            onDragOver={ls.onDragOver(lesson.id)}
            onDrop={ls.onDrop(lesson.id)}
            onDragEnd={ls.onDragEnd}
            className={`transition-colors ${
              ls.overId === lesson.id && ls.draggedId !== lesson.id
                ? 'bg-brand-500/5'
                : ''
            } ${ls.draggedId === lesson.id ? 'opacity-50' : ''}`}
          >
            <div className="flex items-stretch">
              <div
                className="flex items-center px-2 cursor-grab active:cursor-grabbing hover:bg-gray-100"
                title="اسحب لتغيير ترتيب الدرس"
              >
                <GripVertical className="w-4 h-4 text-gray-300" />
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-gray-50 flex-1 min-w-0">
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
                      {lesson.duration_sec > 0 && (
                        <span>{formatDuration(lesson.duration_sec)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button asChild variant="ghost" size="sm" title="تعديل تفصيلي + مرفقات">
                    <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`}>
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </Link>
                  </Button>

                  <form action={togglePreviewLesson}>
                    <input type="hidden" name="id" value={lesson.id} />
                    <input type="hidden" name="course_id" value={courseId} />
                    <input
                      type="hidden"
                      name="is_free_preview"
                      value={lesson.is_free_preview.toString()}
                    />
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

                  <form action={deleteLesson}>
                    <input type="hidden" name="id" value={lesson.id} />
                    <input type="hidden" name="course_id" value={courseId} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </div>
            </div>

            {lessonQuizzes.length > 0 && (
              <div className="pl-9 pr-3 pb-3 space-y-2 bg-gray-50/40 text-xs text-gray-500">
                {lessonQuizzes.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center gap-2 p-2 rounded border border-gray-200 bg-white"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
                    <span className="truncate">{q.title_ar}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
