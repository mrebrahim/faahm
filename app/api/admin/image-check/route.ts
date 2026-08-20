import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic: why don't course thumbnails render in the mobile app?
 *
 * The covers on Bunny are AVIF. Browsers decode it, so the website is
 * fine; React Native's Android loader generally does not, so the app
 * shows a placeholder. There are two possible fixes and which one is
 * available can't be determined from outside the network:
 *
 *   1. Bunny Optimizer — `?format=jpg` converts at the edge. Only works
 *      if the Optimizer add-on is enabled on the pull zone.
 *   2. Re-encode the stored files to JPEG once, server-side. Only works
 *      if this deployment's `sharp` was built with AVIF (libheif)
 *      support.
 *
 * This endpoint actually FETCHES each variant from the production
 * server — which, unlike a local sandbox, can reach Bunny — and reports
 * the content-type that came back. Open it in a browser as an admin and
 * the answer is unambiguous instead of guessed.
 */
export async function GET() {
  await requireAdmin();

  const { data: courses } = await createServiceClient()
    .from('courses')
    .select('slug, title_ar, thumbnail_url')
    .eq('is_published', true)
    .not('thumbnail_url', 'is', null)
    .limit(3);

  const sample = (courses ?? [])[0];
  if (!sample?.thumbnail_url) {
    return Response.json({ error: 'مفيش كورسات بصور للفحص.' }, { status: 404 });
  }

  const base = sample.thumbnail_url;
  const join = (params: string) => (base.includes('?') ? `${base}&${params}` : `${base}?${params}`);

  const variants: Array<{ label: string; url: string }> = [
    { label: 'الأصلي', url: base },
    { label: 'Bunny Optimizer → jpeg', url: join('format=jpeg&width=800') },
    { label: 'Bunny Optimizer → webp', url: join('format=webp&width=800') },
  ];

  const results = await Promise.all(
    variants.map(async (v) => {
      try {
        // GET rather than HEAD: some CDNs answer HEAD from a different
        // path and skip the transform entirely, which would make the
        // Optimizer look broken when it isn't.
        const res = await fetch(v.url, { headers: { Accept: 'image/*' } });
        const buf = await res.arrayBuffer();
        return {
          variant: v.label,
          url: v.url,
          status: res.status,
          content_type: res.headers.get('content-type'),
          bytes: buf.byteLength,
          // The bit that matters: anything other than avif means the
          // mobile app can render it.
          usable_in_app: !(res.headers.get('content-type') ?? '').includes('avif'),
        };
      } catch (err) {
        return {
          variant: v.label,
          url: v.url,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  // Can this deployment re-encode AVIF itself?
  let sharpAvif = false;
  let sharpError: string | null = null;
  try {
    const sharp = (await import('sharp')).default;
    sharpAvif = Boolean((sharp as any).format?.avif?.input?.buffer);
  } catch (err) {
    sharpError = err instanceof Error ? err.message : String(err);
  }

  const optimizerWorks = results.some(
    (r) => 'usable_in_app' in r && r.usable_in_app && r.variant.includes('jpeg')
  );

  return Response.json(
    {
      sample_course: sample.title_ar,
      variants: results,
      server_can_reencode_avif: sharpAvif,
      sharp_error: sharpError,
      verdict: optimizerWorks
        ? '✅ Bunny Optimizer شغّال — التطبيق هيعرض الصور بعد أول build جديد.'
        : sharpAvif
          ? '⚠️ Optimizer مقفول، بس السيرفر يقدر يحوّل. شغّل /api/admin/convert-covers.'
          : '❌ لا Optimizer ولا تحويل على السيرفر. فعّل Bunny Optimizer، أو ارفع الصور JPG بدل AVIF.',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
