import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { auditLog } from '@/lib/admin-audit';
import { uploadLessonAttachment } from '@/lib/storage';

export const runtime = 'nodejs';
// Allow up to 50 MB request body (matches the bucket file_size_limit).
export const maxDuration = 60;

const MAX_SIZE = 50 * 1024 * 1024;

/**
 * POST /api/admin/lessons/[id]/attachments
 *
 * multipart/form-data:
 *   file        — the actual file (required for kind='file')
 *   url         — external URL (required for kind='link')
 *   name        — display label (required)
 *   kind        — 'file' | 'link' (default 'file')
 *
 * Returns: { id, lesson_id, kind, file_name_ar, ... }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireAdmin();
  const lessonId = params.id;

  const formData = await request.formData();
  const name = String(formData.get('name') || '').trim();
  const kind = (String(formData.get('kind') || 'file') === 'link' ? 'link' : 'file') as
    | 'file'
    | 'link';

  if (!name) {
    return NextResponse.json({ error: 'الاسم المعروض مطلوب' }, { status: 400 });
  }

  const service = createServiceClient();
  // Verify lesson exists and grab course_id for the revalidation path + audit.
  const { data: lesson } = await service
    .from('lessons')
    .select('id, course_id')
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) {
    return NextResponse.json({ error: 'الدرس غير موجود' }, { status: 404 });
  }

  let row;
  if (kind === 'link') {
    const url = String(formData.get('url') || '').trim();
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'الرابط لازم يبدأ بـ http(s)' }, { status: 400 });
    }
    const { data, error } = await service
      .from('lesson_attachments')
      .insert({
        lesson_id: lessonId,
        file_name_ar: name,
        file_url: url,
        kind: 'link',
        uploaded_by: ctx.userId,
      })
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    row = data;
  } else {
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'لم يتم اختيار ملف' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'الملف فاضي' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'حجم الملف أكبر من 50MB' },
        { status: 413 }
      );
    }

    let uploaded;
    try {
      uploaded = await uploadLessonAttachment({ lessonId, file });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل رفع الملف';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { data, error } = await service
      .from('lesson_attachments')
      .insert({
        lesson_id: lessonId,
        file_name_ar: name,
        storage_path: uploaded.path,
        file_size_kb: uploaded.size_kb,
        file_type: extractExtension(file.name) || uploaded.content_type,
        kind: 'file',
        uploaded_by: ctx.userId,
      })
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    row = data;
  }

  void auditLog(ctx, {
    action: 'attachment.uploaded',
    resourceType: 'lesson',
    resourceId: lessonId,
    metadata: {
      attachment_id: row.id,
      kind,
      name,
      size_kb: row.file_size_kb ?? null,
    },
  });

  revalidatePath(`/admin/courses/${lesson.course_id}/lessons/${lessonId}`);
  return NextResponse.json({ ok: true, attachment: row });
}

function extractExtension(name: string): string | null {
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : null;
}
