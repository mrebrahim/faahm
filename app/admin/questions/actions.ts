'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';
import { answerLessonQuestion, rejectLessonQuestion } from '@/lib/lesson-questions';

export async function answerQuestion(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  const answer = String(formData.get('answer') || '');
  // Answered questions default to public: one answer serves everyone who
  // gets stuck at the same point. Unticking keeps it private to the asker.
  const isPublic = formData.get('is_public') === 'on';
  if (!id) return;

  await loggedAction(
    ctx,
    { action: 'question.answer', resourceType: 'lesson_question', resourceId: id },
    async () => {
      const result = await answerLessonQuestion({
        questionId: id,
        answer,
        adminId: ctx.userId,
        isPublic,
      });
      if ('error' in result) throw new Error(result.error);
    }
  );

  revalidatePath('/admin/questions');
}

export async function rejectQuestion(formData: FormData) {
  const ctx = await requireAdmin();
  const id = String(formData.get('id') || '');
  if (!id) return;

  await loggedAction(
    ctx,
    { action: 'question.reject', resourceType: 'lesson_question', resourceId: id },
    async () => {
      await rejectLessonQuestion(id, ctx.userId);
    }
  );

  revalidatePath('/admin/questions');
}
