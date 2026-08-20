'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { loggedAction } from '@/lib/admin-audit';
import { uploadToBunny } from '@/lib/bunny-storage';

/**
 * Cover-image maintenance.
 *
 * The course covers are stored as AVIF. Browsers decode that, so the
 * website is fine — but React Native's Android image loader generally
 * does not, which is why the app rendered placeholders. Converting the
 * stored files fixes it once for every client, instead of every client
 * having to work around the format.
 */

type Row = { course: string; ok: boolean; detail: string };

export async function convertCovers(): Promise<void> {
  const ctx = await requireAdmin();
  const service = createServiceClient();

  let sharp: any;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    redirect(
      `/admin/media?error=${encodeURIComponent('sharp مش متاحة على السيرفر.')}`
    );
  }

  if (!sharp.format?.avif?.input?.buffer) {
    redirect(
      `/admin/media?error=${encodeURIComponent(
        'نسخة sharp على السيرفر مش بتقرا AVIF. فعّل Bunny Optimizer بدل كده.'
      )}`
    );
  }

  const { data: courses } = await service
    .from('courses')
    .select('id, slug, title_ar, thumbnail_url')
    .not('thumbnail_url', 'is', null);

  const targets = (courses ?? []).filter((c) =>
    (c.thumbnail_url ?? '').toLowerCase().includes('.avif')
  );

  const rows: Row[] = [];

  await loggedAction(
    ctx,
    { action: 'media.convert_covers', metadata: { count: targets.length } },
    async () => {
      for (const course of targets) {
        try {
          const res = await fetch(course.thumbnail_url!);
          if (!res.ok) throw new Error(`تحميل الصورة فشل (${res.status})`);

          const input = Buffer.from(await res.arrayBuffer());
          const output = await sharp(input)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 82, progressive: true })
            .toBuffer();

          // ASCII path: the current Arabic filenames produce
          // percent-encoded URLs that are awkward everywhere downstream.
          const { publicUrl } = await uploadToBunny({
            objectPath: `course-covers/${course.slug}-${Date.now()}.jpg`,
            bytes: output,
            contentType: 'image/jpeg',
          });

          await service
            .from('courses')
            .update({ thumbnail_url: publicUrl })
            .eq('id', course.id);

          rows.push({
            course: course.title_ar,
            ok: true,
            detail: `${Math.round(input.length / 1024)}KB → ${Math.round(output.length / 1024)}KB`,
          });
        } catch (err) {
          rows.push({
            course: course.title_ar,
            ok: false,
            detail: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  );

  const ok = rows.filter((r) => r.ok).length;

  revalidatePath('/admin/media');
  revalidatePath('/courses');
  revalidatePath('/');
  redirect(
    `/admin/media?done=${ok}&failed=${rows.length - ok}`
  );
}
