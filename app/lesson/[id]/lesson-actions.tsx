'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { markLessonComplete } from './actions';

function runMarkComplete(lessonId: string) {
  const fd = new FormData();
  fd.set('lesson_id', lessonId);
  return markLessonComplete(fd);
}

/**
 * Bar shown right under the player so students can manually flag a lesson
 * as done. The 90% auto-complete still runs in the background via the
 * player's heartbeat — this is just the explicit override.
 */
export function LessonCompleteBar({
  lessonId,
  isCompleted,
}: {
  lessonId: string;
  isCompleted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (isCompleted) {
    return (
      <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 flex items-center gap-2.5 text-brand-700">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium text-sm">تم إكمال هذا الدرس</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-gray-600">
        خلصت الدرس؟ علّمه كمكتمل عشان نتابع تقدمك.
      </span>
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await runMarkComplete(lessonId);
            router.refresh();
          })
        }
      >
        <CheckCircle2 className="w-4 h-4" />
        {pending ? 'جاري الحفظ…' : 'علّم الدرس كمكتمل'}
      </Button>
    </div>
  );
}

/**
 * Prev / next row. When the user hits "next" without having marked the
 * current lesson complete, we open a small confirm modal asking whether
 * to mark complete first or just skip ahead.
 */
export function LessonNav({
  lessonId,
  isCompleted,
  prevHref,
  nextHref,
  nextTitle,
  courseHref,
}: {
  lessonId: string;
  isCompleted: boolean;
  prevHref: string | null;
  nextHref: string | null;
  nextTitle: string | null;
  courseHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const go = () => {
    router.push(nextHref ?? courseHref);
  };

  const skipAndGo = () => {
    setOpen(false);
    go();
  };

  const completeAndGo = () => {
    startTransition(async () => {
      await runMarkComplete(lessonId);
      setOpen(false);
      go();
    });
  };

  const handleNextClick = (e: React.MouseEvent) => {
    if (isCompleted || !nextHref) return;
    e.preventDefault();
    setOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {prevHref ? (
          <Button asChild variant="outline" className="flex-shrink-0">
            <Link href={prevHref}>
              <ArrowRight className="w-4 h-4" />
              السابق
            </Link>
          </Button>
        ) : (
          <div />
        )}

        {nextHref ? (
          <Button
            asChild
            className="min-w-0 max-w-[70%] sm:max-w-none"
            onClick={handleNextClick}
          >
            <Link href={nextHref}>
              <span className="truncate">التالي: {nextTitle}</span>
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={courseHref}>
              <BookOpen className="w-4 h-4" />
              العودة للكورس
            </Link>
          </Button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-brand-500" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold mb-1">
                  تعليم الدرس كمكتمل؟
                </h2>
                <p className="text-sm text-gray-600">
                  خلصت الدرس ده؟ تقدر تعلّمه كمكتمل قبل ما تنتقل للدرس
                  اللي بعده، أو تتخطّى وتفضل تقدر ترجعله بعدين.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
              <Button
                type="button"
                variant="outline"
                onClick={skipAndGo}
                disabled={pending}
              >
                تخطّى
              </Button>
              <Button
                type="button"
                onClick={completeAndGo}
                disabled={pending}
              >
                <CheckCircle2 className="w-4 h-4" />
                {pending ? 'جاري الحفظ…' : 'علّم كمكتمل وانتقل'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
