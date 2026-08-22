import { createServiceClient } from '@/lib/supabase/server';
import { CANONICAL_URL } from '@/lib/constants';
import { SUPPORT_INBOX, emailLayout, escapeHtml, sendEmail } from '@/lib/email';
import {
  LINK_KIND_LABELS,
  PRIVATE_LINK_HINT,
  checkLinkAccess,
  parseSharedLink,
  type LinkAccess,
  type LinkKind,
} from '@/lib/shared-links';

/**
 * Lesson Q&A.
 *
 * A question is asked from inside a lesson and carries both the course
 * and the lesson, so whoever answers it knows exactly what was on
 * screen. Answered questions become a public FAQ on that lesson — one
 * good answer serves every future student who gets stuck in the same
 * place.
 */

export type LessonQuestion = {
  id: string;
  user_id: string;
  asker_name: string;
  question: string;
  timestamp_sec: number | null;
  attachment_url: string | null;
  attachment_kind: LinkKind | null;
  attachment_access: LinkAccess | null;
  status: 'pending' | 'answered' | 'rejected';
  answer: string | null;
  answered_at: string | null;
  is_mine: boolean;
  created_at: string;
};

export async function getLessonQuestions(
  lessonId: string,
  viewerId: string | null
): Promise<LessonQuestion[]> {
  const { data, error } = await createServiceClient().rpc('lesson_questions_for', {
    p_lesson_id: lessonId,
    p_viewer: viewerId,
  });
  if (error) {
    console.error('[questions] read failed', error.message);
    return [];
  }
  return (data ?? []) as LessonQuestion[];
}

/**
 * Save a question and alert the support inbox.
 *
 * The email is best-effort and deliberately awaited AFTER the insert:
 * the question is recorded whether or not the notification lands, and
 * the admin queue is the real source of truth.
 */
export async function askLessonQuestion(opts: {
  userId: string;
  lessonId: string;
  question: string;
  timestampSec?: number | null;
  /** Optional Drive / YouTube / Loom link — a screenshot or recording. */
  attachmentUrl?: string | null;
}): Promise<{ id: string; linkWarning?: string } | { error: string }> {
  const question = opts.question.trim();
  if (question.length < 5) return { error: 'اكتب سؤالك بتفصيل شوية.' };
  if (question.length > 2000) return { error: 'السؤال طويل أوي — اختصره.' };

  // Parse and probe the attachment BEFORE saving, so a locked Drive
  // link is caught while the student is still on the page rather than
  // days later when someone tries to open it.
  let link = null as ReturnType<typeof parseSharedLink>;
  let access: LinkAccess | null = null;

  const rawLink = (opts.attachmentUrl ?? '').trim();
  if (rawLink) {
    link = parseSharedLink(rawLink);
    if (!link) {
      return { error: 'اللينك مش مظبوط. لازم يبدأ بـ https://' };
    }
    access = await checkLinkAccess(link);
    if (access === 'private') {
      // Refuse rather than accept a link nobody can open — accepting it
      // would just move the failure to whoever answers.
      return { error: PRIVATE_LINK_HINT };
    }
  }

  const service = createServiceClient();

  // course_id comes from the lesson, never from the client — otherwise a
  // crafted request could file a question against a course the user
  // can't even see.
  const { data: lesson } = await service
    .from('lessons')
    .select('id, course_id, title_ar, course:courses(slug, title_ar)')
    .eq('id', opts.lessonId)
    .maybeSingle();

  if (!lesson) return { error: 'الدرس ده مش موجود.' };

  // Rate limit: 5 pending questions at a time. Someone who has asked
  // five things nobody has answered yet doesn't need a sixth box.
  const { count } = await service
    .from('lesson_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', opts.userId)
    .eq('status', 'pending');

  if ((count ?? 0) >= 5) {
    return { error: 'عندك أسئلة كتير مستنية رد. استنى نرد عليها الأول 🙂' };
  }

  const { data, error } = await service
    .from('lesson_questions')
    .insert({
      user_id: opts.userId,
      course_id: lesson.course_id,
      lesson_id: lesson.id,
      question,
      timestamp_sec: opts.timestampSec ?? null,
      attachment_url: link?.url ?? null,
      attachment_kind: link?.kind ?? null,
      attachment_access: access,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[questions] insert failed', error?.message);
    return { error: 'مقدرناش نسجّل السؤال دلوقتي. جرّب تاني.' };
  }

  const [{ data: profile }] = await Promise.all([
    service.from('profiles').select('full_name, email').eq('id', opts.userId).maybeSingle(),
  ]);

  const course = Array.isArray(lesson.course) ? lesson.course[0] : lesson.course;

  await sendEmail({
    to: SUPPORT_INBOX,
    // Reply in the mail client goes straight to the student.
    replyTo: profile?.email ?? undefined,
    subject: `سؤال جديد: ${course?.title_ar ?? 'كورس'} — ${lesson.title_ar}`,
    html: emailLayout({
      heading: 'طالب سأل سؤال 🙋',
      body: `
        <p style="margin:0 0 12px;"><strong>الطالب:</strong> ${escapeHtml(
          profile?.full_name || profile?.email || '—'
        )}</p>
        <p style="margin:0 0 12px;"><strong>الكورس:</strong> ${escapeHtml(
          course?.title_ar ?? '—'
        )}</p>
        <p style="margin:0 0 12px;"><strong>الدرس:</strong> ${escapeHtml(lesson.title_ar)}</p>
        ${
          opts.timestampSec
            ? `<p style="margin:0 0 12px;"><strong>عند الدقيقة:</strong> ${Math.floor(
                opts.timestampSec / 60
              )}:${String(Math.floor(opts.timestampSec % 60)).padStart(2, '0')}</p>`
            : ''
        }
        <div style="margin-top:16px;padding:16px;background:#f9fafb;border-radius:12px;border-right:4px solid #16a34a;">
          ${escapeHtml(question).replace(/\n/g, '<br/>')}
        </div>
        ${
          link
            ? `<p style="margin:16px 0 0;">
                 <strong>مرفق (${escapeHtml(LINK_KIND_LABELS[link.kind])}):</strong><br/>
                 <a href="${link.url}" style="color:#16a34a;word-break:break-all;">${escapeHtml(
                   link.url
                 )}</a>
                 ${
                   access === 'unknown'
                     ? '<br/><span style="color:#b45309;font-size:13px;">⚠️ مقدرناش نتأكد إن اللينك مفتوح.</span>'
                     : ''
                 }
               </p>`
            : ''
        }`,
      ctaLabel: 'رد على السؤال',
      ctaUrl: `${CANONICAL_URL}/admin/questions`,
      footer: 'الرد على الإيميل ده بيروح للطالب مباشرة.',
    }),
  });

  return {
    id: data.id,
    linkWarning:
      access === 'unknown'
        ? 'مقدرناش نتأكد إن اللينك مفتوح — اتأكد إن أي حد معاه اللينك يقدر يفتحه.'
        : undefined,
  };
}

/** Admin answers. Emails the student that their question got a reply. */
export async function answerLessonQuestion(opts: {
  questionId: string;
  answer: string;
  adminId: string | null;
  isPublic: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const answer = opts.answer.trim();
  if (answer.length < 2) return { error: 'اكتب الرد.' };

  const service = createServiceClient();

  const { data: q } = await service
    .from('lesson_questions')
    .select('id, user_id, lesson_id, question, lesson:lessons(title_ar, course:courses(slug, title_ar))')
    .eq('id', opts.questionId)
    .maybeSingle();

  if (!q) return { error: 'السؤال ده مش موجود.' };

  const { error } = await service
    .from('lesson_questions')
    .update({
      answer,
      status: 'answered',
      answered_by: opts.adminId,
      answered_at: new Date().toISOString(),
      is_public: opts.isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq('id', opts.questionId);

  if (error) {
    console.error('[questions] answer failed', error.message);
    return { error: 'مقدرناش نحفظ الرد.' };
  }

  const { data: student } = await service
    .from('profiles')
    .select('email, full_name')
    .eq('id', q.user_id)
    .maybeSingle();

  const lesson = Array.isArray(q.lesson) ? q.lesson[0] : q.lesson;
  const course = lesson
    ? Array.isArray((lesson as any).course)
      ? (lesson as any).course[0]
      : (lesson as any).course
    : null;

  if (student?.email) {
    await sendEmail({
      to: student.email,
      subject: `وصلك رد على سؤالك في ${course?.title_ar ?? 'الكورس'} ✅`,
      html: emailLayout({
        heading: `أهلاً ${student.full_name?.split(' ')[0] || ''} 👋`,
        body: `
          <p style="margin:0 0 12px;">ردّينا على سؤالك في درس <strong>${escapeHtml(
            lesson?.title_ar ?? ''
          )}</strong>.</p>
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">سؤالك:</p>
          <div style="padding:12px;background:#f9fafb;border-radius:12px;margin-bottom:16px;">
            ${escapeHtml(q.question).replace(/\n/g, '<br/>')}
          </div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">الرد:</p>
          <div style="padding:16px;background:#f0fdf4;border-radius:12px;border-right:4px solid #16a34a;">
            ${escapeHtml(answer).replace(/\n/g, '<br/>')}
          </div>`,
        ctaLabel: 'ارجع للدرس',
        ctaUrl: `${CANONICAL_URL}/lesson/${q.lesson_id}`,
      }),
    });
  }

  return { ok: true };
}

export async function rejectLessonQuestion(questionId: string, adminId: string | null) {
  await createServiceClient()
    .from('lesson_questions')
    .update({
      status: 'rejected',
      answered_by: adminId,
      answered_at: new Date().toISOString(),
    })
    .eq('id', questionId);
}

export async function countPendingQuestions(): Promise<number> {
  const { count } = await createServiceClient()
    .from('lesson_questions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  return count ?? 0;
}
