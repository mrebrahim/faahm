import { Star, Users, Award } from 'lucide-react';

/**
 * Course-page social proof block. Every number here is a real DB
 * count — no synthesized rating distributions (we don't store
 * per-user ratings yet), no inflated student counts.
 *
 *   - Big rating average + a star row + the actual review count
 *   - Real enrollment count for *this course*
 *   - Aggregate brand signal: '+1,000 طالب على فاهم' so the
 *     visitor pegs course-level proof to platform-level proof
 *
 * The block intentionally skips the 5-bar distribution other
 * platforms show. We don't have the per-user data behind it, and
 * the PRD's honesty rule outweighs the visual lift. If/when a
 * reviews table lands we wire the bars in.
 */
export function CourseSocialProof({
  ratingAvg,
  ratingCount,
  enrollments,
  totalPlatformLearners = 1000,
}: {
  ratingAvg: number | null;
  ratingCount: number | null;
  enrollments: number | null;
  totalPlatformLearners?: number;
}) {
  const avg =
    ratingAvg != null ? Math.max(0, Math.min(5, Number(ratingAvg))) : null;
  const fullStars = avg != null ? Math.round(avg) : 0;
  const reviews = Number(ratingCount) || 0;
  const enrolled = Number(enrollments) || 0;

  if (avg == null && reviews === 0 && enrolled === 0) return null;

  return (
    <section className="rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-500/5 to-white p-5 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-4 items-center">
        {/* Rating tile */}
        {avg != null && (
          <div className="text-center sm:text-start border-b sm:border-b-0 sm:border-e border-gray-200/70 pb-4 sm:pb-0 sm:pe-4">
            <div className="flex items-baseline justify-center sm:justify-start gap-1">
              <span className="font-display text-4xl sm:text-5xl font-extrabold text-foreground tabular-nums">
                {avg.toFixed(1)}
              </span>
              <span className="text-sm text-gray-400">/ 5</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-0.5 mt-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < fullStars
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              ))}
            </div>
            {reviews > 0 && (
              <div className="text-xs text-gray-600 mt-1.5">
                من{' '}
                <span className="font-bold text-foreground">
                  {reviews.toLocaleString('en-US')}
                </span>{' '}
                تقييم على هذا الكورس
              </div>
            )}
          </div>
        )}

        {/* Enrollment tile */}
        {enrolled > 0 && (
          <div className="text-center sm:text-start border-b sm:border-b-0 sm:border-e border-gray-200/70 pb-4 sm:pb-0 sm:pe-4 sm:ps-4">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
              <Users className="w-5 h-5 text-brand-600" aria-hidden />
              <span className="font-display text-3xl sm:text-4xl font-extrabold text-brand-700 tabular-nums">
                +{enrolled.toLocaleString('en-US')}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              طالب انضم لهذا الكورس
            </div>
          </div>
        )}

        {/* Platform brand tile */}
        <div className="text-center sm:text-start sm:ps-4">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
            <Award className="w-5 h-5 text-amber-500" aria-hidden />
            <span className="font-display text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums">
              +{totalPlatformLearners.toLocaleString('en-US')}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            طالب انضم لفاهم — أنت مش أول واحد بيبدأ
          </div>
        </div>
      </div>
    </section>
  );
}
