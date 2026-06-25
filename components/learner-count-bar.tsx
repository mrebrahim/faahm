'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { GraduationCap, ArrowLeft } from 'lucide-react';

/**
 * Site-wide trust strip — surfaces the real learner count (+4,000)
 * above every marketing page so the social proof isn't trapped on
 * /personal-plan alone. Mounted in the root layout, sits above the
 * MainNav (and any page-specific header) so it's the first thing
 * a visitor reads.
 *
 * Hidden on conversion-flow routes (checkout, billing, offline) —
 * Baymard's distraction-removal rule on payment pages outweighs the
 * trust-signal lift everywhere else, and the bar would compete with
 * the order summary on a phone. Same hidden-prefix pattern as the
 * floating WhatsApp button.
 *
 * Non-sticky on purpose: the MainNav header below it is sticky and
 * holds the brand once the visitor scrolls. Stacking two sticky bars
 * would steal vertical real estate from a 360px phone for no extra
 * lift.
 */
const HIDDEN_PREFIXES = ['/checkout', '/billing', '/offline'];
const LEARNERS = 4000;

export function LearnerCountBar() {
  // Defer the pathname read until after mount so SSR can always
  // ship the bar, then the client decides whether to hide it on
  // checkout / billing / offline. Prevents any subtle SSR/client
  // mismatch from `usePathname()` returning a different value
  // between the two passes (which would surface as a hydration
  // error and, in some Next 14 builds, a server-side exception
  // before the client takes over).
  const pathname = usePathname() || '';
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (
    mounted &&
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="إثبات اجتماعي"
      className="w-full bg-gradient-to-l from-brand-500/10 via-brand-500/5 to-transparent border-b border-brand-500/20"
    >
      <div className="container mx-auto px-4 h-9 flex items-center justify-center sm:justify-between gap-3 text-[11px] sm:text-xs">
        <span className="inline-flex items-center gap-1.5 text-brand-800 font-medium min-w-0 truncate">
          <GraduationCap className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" aria-hidden />
          <span>
            انضم لأكثر من{' '}
            <span className="font-extrabold text-brand-700">
              {LEARNERS.toLocaleString('en-US')}
            </span>{' '}
            متعلّم في فاهم
          </span>
        </span>
        <Link
          href="/personal-plan"
          className="hidden sm:inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-800 transition-colors flex-shrink-0"
        >
          ابدأ خطتي الشخصية
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
