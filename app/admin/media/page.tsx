import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, ImageIcon } from 'lucide-react';
import { convertCovers } from './actions';

export const metadata = { title: 'الصور' };
export const dynamic = 'force-dynamic';

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: { error?: string; done?: string; failed?: string };
}) {
  const { data: courses } = await createServiceClient()
    .from('courses')
    .select('slug, title_ar, thumbnail_url')
    .not('thumbnail_url', 'is', null);

  const all = courses ?? [];
  const avif = all.filter((c) => (c.thumbnail_url ?? '').toLowerCase().includes('.avif'));

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">صور الكورسات</h1>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        صيغة AVIF بتشتغل في المتصفح بس مش بتتقري في تطبيق الموبايل — عشان كده
        الكورسات كانت بتظهر من غير صور في التطبيق.
      </p>

      {searchParams.error ? (
        <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="leading-relaxed">{searchParams.error}</span>
        </div>
      ) : null}

      {searchParams.done ? (
        <div className="mb-5 p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-700 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="leading-relaxed">
            اتحوّلت {searchParams.done} صورة
            {Number(searchParams.failed) > 0 ? ` · فشل ${searchParams.failed}` : ''}. اعمل
            build جديد للتطبيق عشان تشوفهم.
          </span>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <ImageIcon className="w-5 h-5 text-brand-600" />
          <span className="font-bold">
            {avif.length} من {all.length} كورس بصيغة AVIF
          </span>
        </div>

        {avif.length === 0 ? (
          <p className="text-sm text-gray-600 leading-relaxed">
            ✅ مفيش صور AVIF. كل الصور بصيغة يقراها التطبيق.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              الزرار ده بيحمّل كل صورة، بيحوّلها JPEG، بيرفعها على Bunny تاني،
              وبيحدّث الرابط في الداتابيز. الصور القديمة بتفضل مكانها — فلو حصل
              أي مشكلة الرجوع ممكن.
            </p>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 mb-4">
              {avif.map((c) => (
                <div
                  key={c.slug}
                  className="p-2.5 text-sm border-b border-gray-100 last:border-0 min-w-0"
                >
                  <p className="font-medium truncate">{c.title_ar}</p>
                  <p className="text-xs text-gray-400 truncate" dir="ltr">
                    {c.thumbnail_url}
                  </p>
                </div>
              ))}
            </div>

            <form action={convertCovers}>
              <Button type="submit" className="w-full sm:w-auto">
                حوّل {avif.length} صورة لـ JPEG
              </Button>
            </form>

            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              لو السيرفر مش قادر يقرا AVIF، هتظهرلك رسالة واضحة — وساعتها الحل
              إنك تفعّل Bunny Optimizer من لوحة Bunny.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
