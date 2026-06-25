'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Mobile-only sticky CTA that hovers above the bottom of the screen
 * once the visitor has scrolled past the hero. Auto-hides when the
 * pricing section is in view so the visitor doesn't see the same
 * button twice in their viewport (the in-page Stripe buttons are
 * the higher-intent click at that point).
 *
 *   - Hidden on >= md (sm:hidden) — desktop already has CTAs in
 *     every section.
 *   - Sits on `safe-area-inset-bottom` so the iOS home indicator
 *     doesn't clip it.
 *   - Won't appear during the first ~80vh of scroll — the hero CTA
 *     is already on-screen there, no need to double up.
 */
export function StickyMobileCTA({
  /** CSS selector for the pricing section. The CTA hides whenever this
   *  element is intersecting the viewport. */
  hideWhenInView = '#pricing',
  href = '#pricing',
  label = 'ابدأ خطتي الشخصية',
}: {
  hideWhenInView?: string;
  href?: string;
  label?: string;
}) {
  const [pastHero, setPastHero] = useState(false);
  const [pricingInView, setPricingInView] = useState(false);
  const ticking = useRef(false);

  // Reveal once the visitor has scrolled past ~80% of viewport height
  // — i.e. the hero is no longer dominating the screen.
  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const threshold = window.innerHeight * 0.6;
        setPastHero(window.scrollY > threshold);
        ticking.current = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hide whenever the pricing block is in view — IntersectionObserver
  // is cheap and won't hammer the main thread.
  useEffect(() => {
    const target = document.querySelector(hideWhenInView) as HTMLElement | null;
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setPricingInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [hideWhenInView]);

  const visible = pastHero && !pricingInView;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 sm:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
      }}
    >
      <div className="bg-gradient-to-t from-white via-white/95 to-transparent pt-6 pb-1 px-4">
        <Link
          href={href}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-xl shadow-brand-500/30 transition-colors"
        >
          {label}
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
