'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { canAccessCourse } from '@/lib/access';
import { awardQuizResult } from '@/lib/xp';

/**
 * Single submit action — we don't bother with a separate "start attempt"
 * step for v1. The quiz_attempts row is created and finalised in one
 * transaction with started_at and submitted_at both set to now.
 *
 * Scoring is whole-question pass/fail (a question is "correct" only when
 * the set of selected options exactly matches the set of is_correct
 * options). Final score is rounded percent of correct questions over
 * total questions.
 */
export async function submitQuizAttempt(formData: FormData) {
  const quizId = String(formData.get('quiz_id') || '');
  if (!quizId) redirect('/dashboard');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/quiz/${quizId}`)}`);
  }

  const service = createServiceClient();

  // Pull the quiz + questions + options; use service client so the
  // access check below is the single source of truth, independent of
  // the quiz RLS policies (which still hardcode subscription-only).
  const { data: quiz } = await service
    .from('quizzes')
    .select(
      `
        id, course_id, lesson_id, passing_score, max_attempts,
        questions:quiz_questions(
          id, type, sort_order,
          options:quiz_options(id, is_correct)
        )
      `
    )
    .eq('id', quizId)
    .maybeSingle();

  if (!quiz) redirect('/dashboard');

  const access = await canAccessCourse(user.id, quiz.course_id);
  if (!access.subscribed && !access.enrolled) {
    redirect(
      `/quiz/${quizId}?error=${encodeURIComponent('الكويز ده محتاج اشتراك أو تسجيل في الكورس.')}`
    );
  }

  // Enforce max_attempts before recording the new row so the user can't
  // exceed the limit by hitting the endpoint directly.
  const { count: attemptCount } = await service
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('user_id', user.id);
  if (typeof attemptCount === 'number' && attemptCount >= (quiz.max_attempts ?? 3)) {
    redirect(
      `/quiz/${quizId}?error=${encodeURIComponent('استنفدت كل المحاولات المسموحة للكويز ده.')}`
    );
  }

  // Build a map of correct-option ids per question, then walk the form
  // entries to score. Empty answers count as "wrong" (whole-question
  // fail), so missing checkboxes don't accidentally pass.
  const questions = (quiz.questions || []) as Array<{
    id: string;
    type: string;
    options: { id: string; is_correct: boolean }[];
  }>;

  const answers: Record<string, string | string[]> = {};
  let correctCount = 0;

  for (const q of questions) {
    const correctSet = new Set(
      q.options.filter((o) => o.is_correct).map((o) => o.id)
    );
    let selected: string[];
    if (q.type === 'multiple_choice') {
      selected = formData.getAll(`q_${q.id}`).map((v) => String(v));
      answers[q.id] = selected;
    } else {
      const one = formData.get(`q_${q.id}`);
      selected = one ? [String(one)] : [];
      answers[q.id] = selected[0] ?? '';
    }

    if (selected.length === correctSet.size && selected.every((id) => correctSet.has(id))) {
      correctCount += 1;
    }
  }

  const total = Math.max(questions.length, 1);
  const score = Math.round((correctCount / total) * 100);
  const is_passed = score >= (quiz.passing_score ?? 70);
  const now = new Date().toISOString();

  const { data: attempt, error } = await service
    .from('quiz_attempts')
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      score,
      is_passed,
      started_at: now,
      submitted_at: now,
      answers,
    })
    .select('id')
    .single();

  if (error || !attempt) {
    redirect(
      `/quiz/${quizId}?error=${encodeURIComponent('فشل حفظ المحاولة. حاول تاني.')}`
    );
  }

  // Only a passing attempt pays, and only once per quiz — retaking a
  // quiz you already passed doesn't farm XP.
  await awardQuizResult({
    userId: user.id,
    quizId,
    courseId: quiz.course_id,
    score,
    isPassed: is_passed,
  });

  revalidatePath(`/quiz/${quizId}`);
  revalidatePath('/dashboard');
  if (quiz.lesson_id) revalidatePath(`/lesson/${quiz.lesson_id}`);
  redirect(`/quiz/${quizId}?submitted=${attempt.id}`);
}
