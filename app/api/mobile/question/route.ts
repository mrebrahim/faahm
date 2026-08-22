import { canAccessCourse } from '@/lib/access';
import { getMobileUser, jsonError, unauthorized } from '@/lib/mobile-auth';
import { askLessonQuestion } from '@/lib/lesson-questions';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Ask a question about the lesson you're watching.
 *
 * Only accepted from someone who can actually open that lesson —
 * otherwise the admin queue fills with questions about content the
 * asker has never seen.
 */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  let body: {
    lesson_id?: string;
    question?: string;
    timestamp_sec?: number;
    attachment_url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('بيانات غير صالحة.');
  }

  const lessonId = String(body.lesson_id || '');
  if (!lessonId) return jsonError('بيانات غير صالحة.');

  const { data: lesson } = await createServiceClient()
    .from('lessons')
    .select('id, course_id, is_free_preview')
    .eq('id', lessonId)
    .maybeSingle();

  if (!lesson) return jsonError('الدرس ده مش موجود.', 404, 'not_found');

  if (!lesson.is_free_preview) {
    const { subscribed, enrolled } = await canAccessCourse(user.id, lesson.course_id);
    if (!subscribed && !enrolled) return jsonError('مش مسموح.', 403, 'forbidden');
  }

  const result = await askLessonQuestion({
    userId: user.id,
    lessonId,
    question: String(body.question || ''),
    attachmentUrl: String(body.attachment_url || ''),
    timestampSec:
      typeof body.timestamp_sec === 'number' && Number.isFinite(body.timestamp_sec)
        ? Math.floor(body.timestamp_sec)
        : null,
  });

  if ('error' in result) return jsonError(result.error);

  return Response.json({
    ok: true,
    id: result.id,
    message: result.linkWarning
      ? `وصلنا سؤالك ✅ — بس ${result.linkWarning}`
      : 'وصلنا سؤالك ✅ هنرد عليك على الإيميل.',
  });
}
