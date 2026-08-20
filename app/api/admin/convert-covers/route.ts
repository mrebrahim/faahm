import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { uploadToBunny } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * One-shot: re-encode every AVIF course cover to JPEG and repoint the
 * database at the new file.
 *
 * This is the permanent fix rather than a per-request workaround.
 * Client-side format juggling has to be re-solved in every client that
 * ever reads these URLs; converting the stored file solves it once, for
 * the app, the website, and anything built later.
 *
 * Runs on the production server because that's what can reach Bunny —
 * and because `sharp` needs to be the deployment's own build, which may
 * or may not carry AVIF (libheif) support. If it doesn't, this reports
 * that plainly instead of failing silently.
 *
 * Safe to re-run: courses already on .jpg are skipped, and the original
 * AVIF is left in place rather than deleted, so a bad conversion can be
 * rolled back by restoring the old URL.
 */
export async function POST() {
  const ctx = await requireAdmin();
  const service = createServiceClient();

  // `any` because the sharp types resolve to the module namespace here,
  // not the callable factory — a typing quirk of the bundled build.
  let sharp: any;
  try {
    sharp = (await import('sharp')).default;
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: 'sharp مش متاحة على السيرفر ده.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  if (!sharp.format?.avif?.input?.buffer) {
    return Response.json(
      {
        ok: false,
        error:
          'نسخة sharp على السيرفر مش بتقرا AVIF. فعّل Bunny Optimizer بدل كده، أو ارفع الصور JPG من الأول.',
      },
      { status: 501 }
    );
  }

  const { data: courses } = await service
    .from('courses')
    .select('id, slug, title_ar, thumbnail_url')
    .not('thumbnail_url', 'is', null);

  const targets = (courses ?? []).filter((c) =>
    (c.thumbnail_url ?? '').toLowerCase().includes('.avif')
  );

  const results: Array<Record<string, unknown>> = [];

  for (const course of targets) {
    try {
      const res = await fetch(course.thumbnail_url!);
      if (!res.ok) throw new Error(`fetch ${res.status}`);

      const input = Buffer.from(await res.arrayBuffer());
      // 1200px wide is plenty for a 16:9 card on any phone or a course
      // hero on desktop, and keeps the file small for a 3G audience.
      const output = await sharp(input)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true })
        .toBuffer();

      // ASCII path — the Arabic filenames Bunny currently holds produce
      // percent-encoded URLs that are awkward everywhere downstream.
      const objectPath = `course-covers/${course.slug}-${Date.now()}.jpg`;
      const { publicUrl } = await uploadToBunny({
        objectPath,
        bytes: output,
        contentType: 'image/jpeg',
      });

      await service.from('courses').update({ thumbnail_url: publicUrl }).eq('id', course.id);

      results.push({
        course: course.title_ar,
        ok: true,
        from_bytes: input.length,
        to_bytes: output.length,
        url: publicUrl,
      });
    } catch (err) {
      results.push({
        course: course.title_ar,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const converted = results.filter((r) => r.ok).length;

  console.log('[convert-covers] done', {
    by: ctx.userEmail,
    converted,
    failed: results.length - converted,
  });

  return Response.json({
    ok: true,
    total_avif: targets.length,
    converted,
    failed: results.length - converted,
    results,
  });
}

/** Dry run — what WOULD be converted, without touching anything. */
export async function GET() {
  await requireAdmin();

  const { data: courses } = await createServiceClient()
    .from('courses')
    .select('slug, title_ar, thumbnail_url')
    .not('thumbnail_url', 'is', null);

  const avif = (courses ?? []).filter((c) =>
    (c.thumbnail_url ?? '').toLowerCase().includes('.avif')
  );

  return Response.json({
    total_courses: courses?.length ?? 0,
    avif_covers: avif.length,
    courses: avif.map((c) => ({ course: c.title_ar, url: c.thumbnail_url })),
    hint: 'ابعت POST على نفس الرابط عشان التحويل يشتغل.',
  });
}
