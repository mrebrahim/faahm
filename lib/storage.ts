import { createServiceClient } from '@/lib/supabase/server';
import { uploadToBunny, deleteFromBunny } from '@/lib/bunny-storage';

export const LESSON_ATTACHMENTS_BUCKET = 'lesson-attachments';
export const COURSE_THUMBNAILS_BUCKET = 'course-thumbnails';

/**
 * Prefix inside the Bunny Storage Zone. Everything the app writes lives
 * under this prefix so we can share the zone with other asset types
 * (banners, avatars, ...) later without collisions.
 */
const BUNNY_THUMBNAILS_PREFIX = 'course-thumbnails';

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

/**
 * Upload a course thumbnail to Bunny CDN Storage and return its public
 * URL. Caller persists the URL on `courses.thumbnail_url`. Replaces any
 * previous thumbnail for the same course (one path per course).
 *
 * Bunny egress is a fraction of Supabase's (~$0.005/GB vs $0.03/GB) and
 * their global CDN puts images near the visitor. Legacy thumbnails still
 * on Supabase keep working via their original URLs — nothing to migrate
 * for read paths.
 */
export async function uploadCourseThumbnail(opts: {
  courseId: string;
  file: File;
}): Promise<{ publicUrl: string; path: string }> {
  const ext = extFromMime(opts.file.type) || extFromName(opts.file.name) || 'jpg';
  // One canonical path per course → updating the thumbnail overwrites the
  // previous object instead of leaving orphans on Bunny.
  const objectPath = `${BUNNY_THUMBNAILS_PREFIX}/${opts.courseId}/cover.${ext}`;
  const bytes = await opts.file.arrayBuffer();

  const { publicUrl } = await uploadToBunny({
    objectPath,
    bytes,
    contentType: opts.file.type || 'image/jpeg',
  });

  // Cache-bust via ?v=... so admins see their update immediately even
  // though the object key is stable.
  return {
    publicUrl: `${publicUrl}?v=${Date.now()}`,
    path: objectPath,
  };
}

/**
 * Best-effort delete of every extension we might have written for this
 * course's cover — the admin may have replaced a jpg with a png or webp
 * between edits, so we try each known extension in turn. 404s are fine.
 */
export async function deleteCourseThumbnail(courseId: string): Promise<void> {
  const exts = ['jpg', 'png', 'webp', 'avif', 'gif', 'jpeg'];
  await Promise.all(
    exts.map((ext) =>
      deleteFromBunny(`${BUNNY_THUMBNAILS_PREFIX}/${courseId}/cover.${ext}`)
    )
  );
}

function extFromMime(mime: string | undefined): string | null {
  if (!mime) return null;
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/avif') return 'avif';
  if (mime === 'image/gif') return 'gif';
  return null;
}

function extFromName(name: string): string | null {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : null;
}

function sanitizeFilename(name: string): string {
  // Strip path separators, collapse whitespace, cap length. Keep Arabic
  // chars — Supabase Storage accepts UTF-8 in object keys.
  const base = name.replace(/[\\/]/g, '_').trim();
  const cleaned = base.replace(/\s+/g, '_').replace(/[^\p{L}\p{N}._-]+/gu, '');
  return cleaned.slice(0, 120) || 'file';
}
