import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight } from 'lucide-react';
import { createCourse } from './actions';

export const metadata = {
  title: 'كورس جديد',
};

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createServiceClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name_ar, slug')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link href="/admin/courses" className="text-sm text-brand-600 hover:text-brand-600 inline-flex items-center gap-1 mb-2">
          <ArrowRight className="w-4 h-4" />
          العودة للكورسات
        </Link>
        <h1 className="font-display text-3xl font-bold">كورس جديد</h1>
        <p className="text-gray-500 mt-1">املأ بيانات الكورس الأساسية. تقدر تضيف الدروس بعد كده.</p>
      </div>

      {searchParams.error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {searchParams.error}
        </div>
      )}

      <form action={createCourse} className="space-y-6">
        <div className="rounded-2xl bg-white border border-gray-200 p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title_ar">عنوان الكورس *</Label>
            <Input
              id="title_ar"
              name="title_ar"
              type="text"
              placeholder="مثلاً: تعلم n8n للأتمتة من الصفر"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">الـ Slug (الرابط) *</Label>
            <Input
              id="slug"
              name="slug"
              type="text"
              placeholder="n8n-automation-basics"
              required
              dir="ltr"
              className="text-left"
              pattern="[a-z0-9-]+"
            />
            <p className="text-xs text-gray-500">
              حروف إنجليزي صغيرة وأرقام وشرطات فقط. مثلاً: <code>n8n-basics</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description_ar">الوصف</Label>
            <textarea
              id="description_ar"
              name="description_ar"
              rows={4}
              placeholder="وصف الكورس وما هيتعلمه الطالب..."
              className="flex w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">التصنيف</Label>
              <select
                id="category_id"
                name="category_id"
                className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="">— اختار تصنيف —</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">المستوى</Label>
              <select
                id="level"
                name="level"
                defaultValue="beginner"
                className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="beginner">مبتدئ</option>
                <option value="intermediate">متوسط</option>
                <option value="advanced">متقدّم</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">رابط الصورة (اختياري)</Label>
            <Input
              id="thumbnail_url"
              name="thumbnail_url"
              type="url"
              placeholder="https://..."
              dir="ltr"
              className="text-left"
            />
            <p className="text-xs text-gray-500">رابط مباشر لصورة الكورس (يفضل 16:9)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="trailer_video_provider">مزوّد الفيديو التشويقي</Label>
              <select
                id="trailer_video_provider"
                name="trailer_video_provider"
                defaultValue="bunny"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm"
              >
                <option value="bunny">Bunny Stream</option>
                <option value="vimeo">Vimeo</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="trailer_video_id">GUID / Vimeo ID / رابط الفيديو التشويقي (اختياري)</Label>
              <Input
                id="trailer_video_id"
                name="trailer_video_id"
                type="text"
                placeholder="GUID أو رابط كامل"
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg">
            إنشاء الكورس
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/admin/courses">إلغاء</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
