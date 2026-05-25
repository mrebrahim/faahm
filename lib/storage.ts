import { createServiceClient } from '@/lib/supabase/server';

export const LESSON_ATTACHMENTS_BUCKET = 'lesson-attachments';

/**
 * Upload a single attachment file into the private lesson-attachments
 * bucket. Returns the object's storage path so the caller can persist
 * it on the lesson_attachments row. We never store a public URL since
 * the bucket is private — downloads always go through a signed-URL
 * server endpoint that enforces subscription access.
 */
export async function uploadLessonAttachment(opts: {
  lessonId: string;
  file: File;
}): Promise<{ path: string; size_kb: number; content_type: string }> {
  const service = createServiceClient();

  const sanitized = sanitizeFilename(opts.file.name);
  // Object key namespaces uploads by lesson so listing/cleanup is easy
  // and so two lessons can have files with the same name.
  const path = `${opts.lessonId}/${Date.now()}-${sanitized}`;

  const bytes = await opts.file.arrayBuffer();
  const { error } = await service.storage
    .from(LESSON_ATTACHMENTS_BUCKET)
    .upload(path, bytes, {
      contentType: opts.file.type || 'application/octet-stream',
      upsert: false,
    });
  if (error) throw new Error(error.message);

  return {
    path,
    size_kb: Math.ceil(opts.file.size / 1024),
    content_type: opts.file.type || 'application/octet-stream',
  };
}

/**
 * Generate a short-lived signed URL for a stored attachment. Caller is
 * responsible for verifying the user is allowed to access this lesson
 * (subscribed, enrolled, or free-preview) before calling.
 */
export async function signLessonAttachment(
  storagePath: string,
  ttlSeconds = 60 * 60
): Promise<string | null> {
  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(LESSON_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    console.error('[storage] signed url failed', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Drop an object from the bucket. Failures are swallowed because the
 * row may be removed first and we don't want to block the DB delete
 * if the object is already gone.
 */
export async function deleteLessonAttachmentObject(
  storagePath: string | null | undefined
): Promise<void> {
  if (!storagePath) return;
  try {
    const service = createServiceClient();
    await service.storage.from(LESSON_ATTACHMENTS_BUCKET).remove([storagePath]);
  } catch (err) {
    console.warn('[storage] failed to delete object', storagePath, err);
  }
}

function sanitizeFilename(name: string): string {
  // Strip path separators, collapse whitespace, cap length. Keep Arabic
  // chars — Supabase Storage accepts UTF-8 in object keys.
  const base = name.replace(/[\\/]/g, '_').trim();
  const cleaned = base.replace(/\s+/g, '_').replace(/[^\p{L}\p{N}._-]+/gu, '');
  return cleaned.slice(0, 120) || 'file';
}
