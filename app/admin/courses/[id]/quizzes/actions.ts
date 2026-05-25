'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction, formDataForLog } from '@/lib/admin-audit';

type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false';

const VALID_QUESTION_TYPES = new Set<QuestionType>([
  'single_choice',
  'multiple_choice',
  'true_false',
]);

// ============================================================================
// QUIZ
// ============================================================================

export async function createQuiz(formData: FormData) {
  const ctx = await requireAdmin();
  const courseId = String(formData.get('course_id') || '');
  const lessonIdRaw = String(formData.get('lesson_id') || '').trim();
  const lessonId = lessonIdRaw || null;
  const title_ar = String(formData.get('title_ar') || '').trim();
  const description_ar = String(formData.get('description_ar') || '').trim() || null;
  const passing_score = clamp(parseInt(String(formData.get('passing_score') || '70'), 10), 0, 100);
  const max_attempts = Math.max(1, parseInt(String(formData.get('max_attempts') || '3'), 10) || 3);
  const time_limit_raw = String(formData.get('time_limit_minutes') || '').trim();
  const time_limit_minutes = time_limit_raw ? Math.max(1, parseInt(time_limit_raw, 10)) : null;
  const is_required = formData.get('is_required') === 'on';

  if (!courseId) return;
  if (!title_ar) {
    redirect(
      `/admin/courses/${courseId}/quizzes?error=${encodeURIComponent('عنوان الكويز مطلوب')}`
    );
  }

  let newId: string | null = null;
  try {
    newId = await loggedAction(
      ctx,
      {
        action: 'quiz.create',
        resourceType: 'quiz',
        metadata: { course_id: courseId, lesson_id: lessonId, payload: formDataForLog(formData) },
      },
      async () => {
        const service = createServiceClient();
        const { data, error } = await service
          .from('quizzes')
          .insert({
            course_id: courseId,
            lesson_id: lessonId,
            title_ar,
            description_ar,
            passing_score,
            max_attempts,
            time_limit_minutes,
            is_required,
          })
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        return data.id as string;
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل إنشاء الكويز';
    redirect(`/admin/courses/${courseId}/quizzes?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/admin/courses/${courseId}/quizzes`);
  redirect(`/admin/courses/${courseId}/quizzes/${newId}`);
}

export async function updateQuiz(formData: FormData) {
  const ctx = await requireAdmin();
  const quizId = String(formData.get('id') || '');
  const courseId = String(formData.get('course_id') || '');
  if (!quizId || !courseId) return;

  const updates = {
    title_ar: String(formData.get('title_ar') || '').trim(),
    description_ar: String(formData.get('description_ar') || '').trim() || null,
    passing_score: clamp(parseInt(String(formData.get('passing_score') || '70'), 10), 0, 100),
    max_attempts: Math.max(1, parseInt(String(formData.get('max_attempts') || '3'), 10) || 3),
    time_limit_minutes: (() => {
      const t = String(formData.get('time_limit_minutes') || '').trim();
      return t ? Math.max(1, parseInt(t, 10)) : null;
    })(),
    is_required: formData.get('is_required') === 'on',
  };

  if (!updates.title_ar) {
    redirect(
      `/admin/courses/${courseId}/quizzes/${quizId}?error=${encodeURIComponent('عنوان الكويز مطلوب')}`
    );
  }

  await loggedAction(
    ctx,
    {
      action: 'quiz.update',
      resourceType: 'quiz',
      resourceId: quizId,
      metadata: { course_id: courseId, payload: formDataForLog(formData) },
    },
    async () => {
      const service = createServiceClient();
      const { error } = await service.from('quizzes').update(updates).eq('id', quizId);
      if (error) throw new Error(error.message);
    }
  );

  revalidatePath(`/admin/courses/${courseId}/quizzes/${quizId}`);
  redirect(`/admin/courses/${courseId}/quizzes/${quizId}?success=updated`);
}

export async function deleteQuiz(formData: FormData) {
  const ctx = await requireAdmin();
  const quizId = String(formData.get('id') || '');
  const courseId = String(formData.get('course_id') || '');
  if (!quizId || !courseId) return;

  await loggedAction(
    ctx,
    {
      action: 'quiz.delete',
      resourceType: 'quiz',
      resourceId: quizId,
      metadata: { course_id: courseId },
    },
    async () => {
      const service = createServiceClient();
      // Cascade is set up via FK on quiz_questions → quiz_options → quiz_attempts;
      // a single delete here removes everything connected.
      await service.from('quizzes').delete().eq('id', quizId);
    }
  );

  revalidatePath(`/admin/courses/${courseId}/quizzes`);
  redirect(`/admin/courses/${courseId}/quizzes?success=deleted`);
}

// ============================================================================
// QUESTIONS
// ============================================================================

export async function addQuestion(formData: FormData) {
  const ctx = await requireAdmin();
  const quizId = String(formData.get('quiz_id') || '');
  const courseId = String(formData.get('course_id') || '');
  if (!quizId || !courseId) return;

  const type = String(formData.get('type') || 'single_choice') as QuestionType;
  if (!VALID_QUESTION_TYPES.has(type)) {
    redirect(
      `/admin/courses/${courseId}/quizzes/${quizId}?error=${encodeURIComponent('نوع السؤال غير صحيح')}`
    );
  }
  const question_ar = String(formData.get('question_ar') || '').trim();
  const explanation_ar = String(formData.get('explanation_ar') || '').trim() || null;

  if (!question_ar || question_ar.length < 3) {
    redirect(
      `/admin/courses/${courseId}/quizzes/${quizId}?error=${encodeURIComponent('نص السؤال قصير جدًا')}`
    );
  }

  // Build options from the dynamic fields option_0..option_N + correct_0..N
  const options: { option_ar: string; is_correct: boolean }[] = [];
  if (type === 'true_false') {
    options.push(
      { option_ar: 'صح', is_correct: formData.get('tf_correct') === 'true' },
      { option_ar: 'خطأ', is_correct: formData.get('tf_correct') === 'false' }
    );
  } else {
    // Up to 8 dynamic options
    for (let i = 0; i < 8; i++) {
      const text = String(formData.get(`option_${i}`) || '').trim();
      if (!text) continue;
      const isCorrect =
        type === 'single_choice'
          ? String(formData.get('correct_single') || '') === String(i)
          : formData.get(`correct_${i}`) === 'on';
      options.push({ option_ar: text, is_correct: isCorrect });
    }
  }

  // Validate option counts + correct answers
  if (options.length < 2) {
    redirect(
      `/admin/courses/${courseId}/quizzes/${quizId}?error=${encodeURIComponent('السؤال لازم خيارين على الأقل')}`
    );
  }
  const correctCount = options.filter((o) => o.is_correct).length;
  if (correctCount < 1) {
    redirect(
      `/admin/courses/${courseId}/quizzes/${quizId}?error=${encodeURIComponent('حدد الإجابة الصحيحة')}`
    );
  }
  if (type === 'single_choice' && correctCount > 1) {
    redirect(
      `/admin/courses/${courseId}/quizzes/${quizId}?error=${encodeURIComponent('إجابة واحدة فقط للأسئلة الفردية')}`
    );
  }

  await loggedAction(
    ctx,
    {
      action: 'quiz.question_added',
      resourceType: 'quiz',
      resourceId: quizId,
      metadata: { type, options_count: options.length },
    },
    async () => {
      const service = createServiceClient();

      const { count: existingCount } = await service
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId);

      const { data: question, error: qErr } = await service
        .from('quiz_questions')
        .insert({
          quiz_id: quizId,
          question_ar,
          type,
          explanation_ar,
          sort_order: existingCount || 0,
        })
        .select('id')
        .single();
      if (qErr) throw new Error(qErr.message);

      const optionRows = options.map((o, i) => ({
        question_id: question.id,
        option_ar: o.option_ar,
        is_correct: o.is_correct,
        sort_order: i,
      }));
      const { error: oErr } = await service.from('quiz_options').insert(optionRows);
      if (oErr) throw new Error(oErr.message);
    }
  );

  revalidatePath(`/admin/courses/${courseId}/quizzes/${quizId}`);
  redirect(`/admin/courses/${courseId}/quizzes/${quizId}?success=question_added`);
}

export async function deleteQuestion(formData: FormData) {
  const ctx = await requireAdmin();
  const questionId = String(formData.get('question_id') || '');
  const quizId = String(formData.get('quiz_id') || '');
  const courseId = String(formData.get('course_id') || '');
  if (!questionId) return;

  await loggedAction(
    ctx,
    {
      action: 'quiz.question_removed',
      resourceType: 'quiz',
      resourceId: quizId,
      metadata: { question_id: questionId },
    },
    async () => {
      const service = createServiceClient();
      // quiz_options cascades on FK.
      await service.from('quiz_questions').delete().eq('id', questionId);
    }
  );

  revalidatePath(`/admin/courses/${courseId}/quizzes/${quizId}`);
  redirect(`/admin/courses/${courseId}/quizzes/${quizId}?success=question_removed`);
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
