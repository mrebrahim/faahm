'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, BookOpen, Clock, Star } from 'lucide-react';

export type CarouselCourse = {
  id: string;
  slug: string;
  title_ar: string;
  thumbnail_url: string | null;
  total_lessons: number;
  total_duration_sec: number;
  rating_avg: string | number | null;
  rating_count: number | null;
};

function formatDuration(sec: number): string {
  if (sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m} دقيقة`;
  if (m === 0) return `${h} ساعة`;
  return `${h}س ${m}د`;
}

/**
 * Horizontal-scroll course carousel — native scroll-snap on the
 * container, so touch / trackpad swipes feel right with zero JS,
 * and the prev/next buttons just nudge `scrollBy` for the desktop
 * mouse case. Buttons hide automatically at either end of the rail.
 *
 * Cards are RTL-aware (in /lib RTL the rail still snaps "next" to the
 * left visually), and every card links straight into the course
 * landing page so the visitor can drill in without leaving the funnel.
 */
export function CourseCarousel({
  courses,
  /** Per-card width — overridable so two carousels on one page can
   *  differ (we use bigger cards for the 3 featured AI courses). */
  cardWidthClass = 'w-[260px] sm:w-[280px]',
  /** Show the small "كورس AI" pill on each card. */
  aiPill = false,
}: {
  courses: CarouselCourse[];
  cardWidthClass?: string;
  aiPill?: boolean;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  // Track end-of-rail state so the prev/next buttons can grey out when
  // there's nothing left to scroll to in that direction. Re-checks on
  // scroll + resize so it stays accurate as the rail width changes.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const tick = () => {
      // scrollLeft on RTL is negative in some browsers and 0-based in
      // others. Math.abs normalises both.
      const sl = Math.abs(rail.scrollLeft);
      const max = rail.scrollWidth - rail.clientWidth;
      setCanScrollPrev(sl > 1);
      setCanScrollNext(sl < max - 1);
    };
    tick();
    rail.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    return () => {
      rail.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
    };
  }, [courses.length]);

  function nudge(direction: 'prev' | 'next') {
    const rail = railRef.current;
    if (!rail) return;
    const delta = rail.clientWidth * 0.8;
    // In RTL, "next" visually means scrollLeft DECREASES (moves further
    // negative). dir attr on the rail is 'rtl', so browsers handle the
    // sign automatically — we just pick the right sign here.
    const sign = direction === 'next' ? -1 : 1;
    rail.scrollBy({ left: delta * sign, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      {/* Prev / Next — desktop only. Mobile users swipe. */}
      <button
        type="button"
        onClick={() => nudge('prev')}
        disabled={!canScrollPrev}
        aria-label="السابق"
        className={`hidden md:flex absolute -end-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md items-center justify-center transition-all ${
          canScrollPrev
            ? 'opacity-100 hover:bg-gray-50'
            : 'opacity-30 pointer-events-none'
        }`}
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>
      <button
        type="button"
        onClick={() => nudge('next')}
        disabled={!canScrollNext}
        aria-label="التالي"
        className={`hidden md:flex absolute -start-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md items-center justify-center transition-all ${
          canScrollNext
            ? 'opacity-100 hover:bg-gray-50'
            : 'opacity-30 pointer-events-none'
        }`}
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      {/* The rail. -mx + px on mobile lets the snap points reach edge-
          to-edge so the first/last card sits flush against the screen
          edge instead of in an awkward gutter. */}
      <div
        ref={railRef}
        dir="rtl"
        className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-4 px-4 md:mx-0 md:px-1 pb-3"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {courses.map((c) => {
          const rating = c.rating_avg != null ? Number(c.rating_avg) : null;
          return (
            <Link
              key={c.id}
              href={`/course/${c.slug}`}
              className={`group flex flex-col flex-shrink-0 ${cardWidthClass} snap-start rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/10 transition-all`}
            >
              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                {c.thumbnail_url ? (
                  <Image
                    src={c.thumbnail_url}
                    alt={c.title_ar}
                    fill
                    // Tells the optimizer the largest CSS width any
                    // breakpoint asks for, so it ships the right
                    // resolution instead of the raw 1080p source.
                    sizes="(max-width: 640px) 280px, (max-width: 1024px) 340px, 340px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    quality={70}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/20 to-gray-100">
                    <BookOpen className="w-10 h-10 text-brand-500/40" />
                  </div>
                )}
                {aiPill && (
                  <span className="absolute top-2 start-2 inline-flex items-center gap-1 bg-brand-500 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow">
                    كورس AI
                  </span>
                )}
              </div>
              <div className="p-3 sm:p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors min-h-[40px]">
                  {c.title_ar}
                </h3>
                <div className="mt-auto pt-2 flex items-center gap-2 text-[11px] sm:text-xs text-gray-500 flex-wrap">
                  {rating != null && c.rating_count != null && c.rating_count > 0 && (
                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-700">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span dir="ltr">{rating.toFixed(1)}</span>
                      <span className="text-gray-400 font-normal ms-0.5" dir="ltr">
                        ({c.rating_count})
                      </span>
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
    </div>
  );
}
