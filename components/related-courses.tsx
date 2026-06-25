import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Clock, Star, ArrowLeft } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { RelatedCandidate } from '@/lib/related-courses';

/**
 * Related-courses rail at the bottom of a course detail page. The
 * candidates come from `pickRelated()` — for the AI flagship slugs
 * the order is hand-curated (n8n → vibe-coding → ai-video →
 * prompt-fundamentals), for everything else it's same-category by
 * review count.
 *
 *   - 2-column grid on mobile, 4-column on lg: — no horizontal scroll
 *     so the section reads at one glance on a phone.
 *   - Every card is a Link straight into /course/<slug>, so the
 *     visitor never has to leave the page to keep exploring.
 *   - Thumbnails come from the existing Bunny CDN URLs via next/image
 *     so the AVIF/srcset path is the same as the carousels on
 *     /personal-plan.
 */
export function RelatedCourses({
  courses,
}: {
  courses: RelatedCandidate[];
}) {
  if (!courses.length) return null;

  return (
    <section className="container mx-auto px-4 max-w-6xl py-10 sm:py-14">
      <div className="flex items-end justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold">
            كورسات ذات صلة
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            تعلّم تاني هتفيدك بعد هذا الكورس — كل ده داخل اشتراك واحد.
          </p>
        </div>
        <Link
          href="/courses"
          className="hidden sm:inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium whitespace-nowrap"
        >
          كل الكورسات
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {courses.map((c) => {
          const rating = c.rating_avg != null ? Number(c.rating_avg) : null;
          return (
            <Link
              key={c.id}
              href={`/course/${c.slug}`}
              className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/10 transition-all"
            >
              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                {c.thumbnail_url ? (
                  <Image
                    src={c.thumbnail_url}
                    alt={c.title_ar}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    quality={70}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/20 to-gray-100">
                    <BookOpen className="w-10 h-10 text-brand-500/40" />
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors min-h-[40px]">
                  {c.title_ar}
                </h3>
                <div className="mt-auto pt-2 flex items-center gap-2 text-[11px] sm:text-xs text-gray-500 flex-wrap">
                  {rating != null && Number(c.rating_count) > 0 && (
                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-700">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span dir="ltr">{rating.toFixed(1)}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5">
                    <BookOpen className="w-3 h-3" />
                    {c.total_lessons} درس
                  </span>
                  {c.total_duration_sec > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDuration(c.total_duration_sec)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 text-center sm:hidden">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          كل الكورسات
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
