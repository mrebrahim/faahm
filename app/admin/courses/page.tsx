import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Edit, Eye, EyeOff } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

export const metadata = {
  title: 'إدارة الكورسات',
};

export default async function AdminCoursesPage() {
  const supabase = createServiceClient();

  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id, slug, title_ar, thumbnail_url, is_published,
      total_lessons, total_duration_sec, sort_order, created_at,
      category:categories(name_ar),
      instructor:instructors(full_name_ar)
    `)
    .order('sort_order')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">الكورسات</h1>
          <p className="text-ink-400 mt-1">{courses?.length || 0} كورس</p>
        </div>
        <Button asChild>
          <Link href="/admin/courses/new">
            <Plus className="w-4 h-4" />
            كورس جديد
          </Link>
        </Button>
      </div>

      {courses && courses.length > 0 ? (
        <div className="rounded-2xl bg-ink-800/40 border border-ink-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-900/50 text-xs uppercase text-ink-400">
                <tr>
                  <th className="text-right p-4">الكورس</th>
                  <th className="text-right p-4">التصنيف</th>
                  <th className="text-right p-4">المدرّب</th>
                  <th className="text-right p-4">الدروس</th>
                  <th className="text-right p-4">المدة</th>
                  <th className="text-right p-4">الحالة</th>
                  <th className="text-right p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/50">
                {courses.map((course: any) => (
                  <tr key={course.id} className="hover:bg-ink-800/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-ink-700 flex-shrink-0 overflow-hidden">
                          {course.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-ink-500" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{course.title_ar}</div>
                          <div className="text-xs text-ink-400">{course.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-ink-300">{course.category?.name_ar || '—'}</td>
                    <td className="p-4 text-ink-300">{course.instructor?.full_name_ar || '—'}</td>
                    <td className="p-4 text-ink-300">{course.total_lessons || 0}</td>
                    <td className="p-4 text-ink-300">{formatDuration(course.total_duration_sec || 0)}</td>
                    <td className="p-4">
                      {course.is_published ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-500/20 text-brand-400 text-xs">
                          <Eye className="w-3 h-3" />
                          منشور
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-ink-700/50 text-ink-400 text-xs">
                          <EyeOff className="w-3 h-3" />
                          مسودة
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/courses/${course.id}`}>
                          <Edit className="w-4 h-4" />
                          تعديل
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-ink-800/40 border border-ink-700/50 p-16 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-ink-500" />
          <h3 className="font-display text-xl font-bold mb-2">لسه ما فيش كورسات</h3>
          <p className="text-ink-400 mb-6">ابدأ بإضافة أول كورس على المنصة</p>
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="w-4 h-4" />
              أضف أول كورس
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
