import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { formatDuration } from '@/lib/utils';
import { BookOpen, Clock, Search, Filter, CheckCircle2, Star } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

export const metadata = {
  title: 'الكورسات — فاهم!',
  description: 'تصفّح جميع كورسات فاهم! بالذكاء الاصطناعي — تسويق، أتمتة، برمجة، صناعة محتوى.',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدّم',
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; level?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name_ar')
    .eq('is_active', true)
    .order('sort_order');

  let query = supabase
    .from('courses')
    .select(
      'id, slug, title_ar, short_description_ar, thumbnail_url, level, total_lessons, total_duration_sec, category_id, what_you_learn, rating_avg, rating_count, instructors(full_name_ar)'
    )
    .eq('is_published', true);

  if (searchParams.q) {
    const q = searchParams.q.trim().replace(/[%_]/g, '');
    if (q) {
      query = query.or(`title_ar.ilike.%${q}%,short_description_ar.ilike.%${q}%`);
    }
  }
  if (searchParams.level && ['beginner', 'intermediate', 'advanced'].includes(searchParams.level)) {
    query = query.eq('level', searchParams.level);
  }
  if (searchParams.category) {
    const cat = categories?.find((c) => c.slug === searchParams.category);
    if (cat) query = query.eq('category_id', cat.id);
  }

  const { data: courses } = await query.order('sort_order').order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href={ROUTES.courses} className="text-brand-600 font-medium">الكورسات</Link>
            <Link href={ROUTES.pricing} className="text-gray-600 hover:text-foreground">الأسعار</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.dashboard}>لوحتي</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href={ROUTES.login}>دخول</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={ROUTES.signup}>تسجيل</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold mb-2">
            كل <span className="text-gradient-brand">الكورسات</span>
          </h1>
          <p className="text-gray-600">
            {courses?.length || 0} كورس متاح — اشتراك واحد بيفتحلك المحتوى كله.
          </p>
        </div>

        {/* Search */}
        <form className="mb-6">
          {/* preserve other params */}
          {searchParams.category && (
            <input type="hidden" name="category" value={searchParams.category} />
          )}
          {searchParams.level && (
            <input type="hidden" name="level" value={searchParams.level} />
          )}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q || ''}
              placeholder="ابحث عن كورس، مدرّب، أو موضوع..."
              className="w-full h-12 pr-11 pl-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </form>

        {/* Filters. Two horizontally-scrollable rows on mobile (categories,
            then levels) so the chip set never wraps into a noisy multi-row
            mess. Tailwind's `-mx-4 px-4` lets the row scroll edge-to-edge
            inside the container. */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-2 -mx-4 px-4 overflow-x-auto md:flex-wrap md:mx-0 md:px-0 md:overflow-visible">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
              <Filter className="w-3.5 h-3.5" /> التصنيف
            </span>
            <FilterChip
              label="الكل"
              active={!searchParams.category}
              href={buildHref(searchParams, { category: undefined })}
            />
            {categories?.map((cat) => (
              <FilterChip
                key={cat.id}
                label={cat.name_ar}
                active={searchParams.category === cat.slug}
                href={buildHref(searchParams, { category: cat.slug })}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 -mx-4 px-4 overflow-x-auto md:flex-wrap md:mx-0 md:px-0 md:overflow-visible">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
              المستوى
            </span>
            <FilterChip
              label="الكل"
              active={!searchParams.level}
              href={buildHref(searchParams, { level: undefined })}
            />
            {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
              <FilterChip
                key={lvl}
                label={LEVEL_LABELS[lvl]}
                active={searchParams.level === lvl}
                href={buildHref(searchParams, { level: lvl })}
              />
            ))}
          </div>
        </div>

        {/* Grid */}
        {courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <div className="p-16 rounded-2xl bg-white border border-gray-200 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-bold text-lg mb-2">
              {searchParams.q || searchParams.category || searchParams.level
                ? 'مفيش كورسات بالفلاتر دي'
                : 'لسه ما فيش كورسات منشورة'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchParams.q || searchParams.category || searchParams.level
                ? 'جرّب تشيل بعض الفلاتر أو تبحث بكلمة تانية'
                : 'تابعنا — أول كورسات هتنزل قريب'}
            </p>
            {(searchParams.q || searchParams.category || searchParams.level) && (
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.courses}>مسح الفلاتر</Link>
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function buildHref(
  current: { q?: string; category?: string; level?: string },
  patch: { q?: string; category?: string; level?: string }
): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.category) params.set('category', next.category);
  if (next.level) params.set('level', next.level);
  const qs = params.toString();
  return qs ? `${ROUTES.courses}?${qs}` : ROUTES.courses;
}

function FilterChip({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex-shrink-0 whitespace-nowrap ${
        active
          ? 'bg-brand-500 text-white border-brand-500'
          : 'bg-white text-gray-600 border-gray-200 hover:border-brand-500/40 hover:text-brand-600'
      }`}
    >
      {label}
    </Link>
  );
}

function CourseCard({ course }: { course: any }) {
  const instructor = Array.isArray(course.instructors)
    ? course.instructors[0]
    : course.instructors;
  const learnPoints: string[] = Array.isArray(course.what_you_learn)
    ? course.what_you_learn
    : [];
  const card = (
    <Link
      href={ROUTES.course(course.slug)}
      className="group flex flex-col overflow-hidden rounded-xl bg-white border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail_url}
            alt={course.title_ar}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/20 to-gray-100">
            <BookOpen className="w-12 h-12 text-brand-500/40" />
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-1.5">
        <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
          {course.title_ar}
        </h3>
        {instructor?.full_name_ar && (
          <p className="text-xs text-gray-500 truncate">{instructor.full_name_ar}</p>
        )}
        {course.short_description_ar && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {course.short_description_ar}
          </p>
        )}
        <div className="mt-auto pt-2 flex items-center flex-wrap gap-1.5 text-[11px]">
          {course.rating_count > 0 && (
            <>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 text-gray-700">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span dir="ltr" className="font-bold">
                  {Number(course.rating_avg).toFixed(1)}
                </span>
              </span>
              <span dir="ltr" className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">
                {course.rating_count.toLocaleString('en-US')} ratings
              </span>
            </>
          )}
          {course.total_duration_sec > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">
              <Clock className="w-3 h-3" />
              {formatDuration(course.total_duration_sec)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">
            <BookOpen className="w-3 h-3" />
            {course.total_lessons} درس
          </span>
          <span className="px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">
            {LEVEL_LABELS[course.level] || course.level}
          </span>
        </div>
      </div>
    </Link>
  );

  // Radix HoverCard opens on pointer events from a mouse only — touch
  // devices are ignored by design, so mobile users get the bare card.
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>{card}</HoverCardTrigger>
      <HoverCardContent side="left" align="start" className="w-96">
        <div className="space-y-3">
          <div>
            <h4 className="font-bold text-base leading-snug mb-1">
              {course.title_ar}
            </h4>
            {course.short_description_ar && (
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                {course.short_description_ar}
              </p>
            )}
          </div>

          {learnPoints.length > 0 ? (
            <div>
              <div className="text-sm font-bold mb-2">اللي هتتعلّمه</div>
              <ul className="space-y-2">
                {learnPoints.slice(0, 4).map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">
              تفاصيل أكتر عن الكورس داخل صفحته.
            </p>
          )}

          <Link
            href={ROUTES.course(course.slug)}
            className="block w-full text-center text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-lg py-2.5 transition-colors"
          >
            افتح الكورس
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
