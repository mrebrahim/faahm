'use client';

import { useEffect, useRef, useState } from 'react';
import { Users, BookOpen, Clock, Star } from 'lucide-react';

/**
 * Dense, above-the-fold hero stats bar — matches competitor visual
 * weight (easyT's '+793K learners' density) using ONLY real numbers
 * pulled from our DB or owner-confirmed. The PRD's golden rule: pick
 * the larger honest unit. '+457 درس' is the same truth as '23 كورس'
 * but reads at competitor scale.
 *
 *   - 2×2 grid on mobile (each tile keeps the number large and
 *     legible at 360px), single horizontal row above sm: so the
 *     fold isn't dominated on big screens.
 *   - Brand-green digits + small label underneath each.
 *   - CountUp animates from 0 → final value over ~1.2s the first
 *     time the tile enters the viewport. After that it stays at
 *     the final number so a scroll-back doesn't replay it.
 *
 * No fake numbers, no fake counters: the value passed in IS the
 * locked final value. The animation is purely cosmetic over real
 * data.
 */
const ICONS = {
  users: Users,
  lesson: BookOpen,
  clock: Clock,
  star: Star,
} as const;

type IconKey = keyof typeof ICONS;

export function HeroStat({
  icon,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  label,
}: {
  icon: IconKey;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
}) {
  const Icon = ICONS[icon];
  const display = useCountUp(value, decimals);

  return (
    <div className="flex flex-col items-center text-center gap-1 rounded-2xl border border-brand-500/15 bg-white px-3 py-4 shadow-sm sm:bg-transparent sm:border-transparent sm:shadow-none sm:py-2 sm:px-2">
      <div className="flex items-center justify-center gap-1.5">
        <Icon
          className={`w-4 h-4 sm:w-5 sm:h-5 ${
            icon === 'star' ? 'fill-amber-400 text-amber-400' : 'text-brand-600'
          }`}
          aria-hidden
        />
        <span className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-brand-700 tabular-nums">
          {prefix}
          {display}
          {suffix}
        </span>
      </div>
      <div className="text-[11px] sm:text-xs text-gray-600 leading-tight">
        {label}
      </div>
    </div>
  );
}

HeroStat.Grid = function HeroStatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 mb-1">
      {children}
    </div>
  );
};

/**
 * Tween a number from 0 → target the first time the calling element
 * is on screen. After the tween locks at `target`, no re-run on
 * subsequent scrolls — replaying a count is distracting after the
 * first impression.
 */
function useCountUp(target: number, decimals: number) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);
  const fmt = (v: number) =>
    v.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  useEffect(() => {
    if (started.current) return;
    // Respect users who asked the OS to reduce motion — skip the
    // count entirely.
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setN(target);
      started.current = true;
      return;
    }

    let raf = 0;
    const DUR = 1200;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / DUR, 1);
      // easeOutCubic — fast start, gentle finish so the final digits
      // settle rather than slap into place.
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    // Don't start until the tile is on screen. Body-level pages with
    // long heros mean these stats may be below the fold despite the
    // 'above the fold' label.
    const el = ref.current?.parentElement;
    if (!el) {
      raf = requestAnimationFrame(tick);
      started.current = true;
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          raf = requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);

  // Hidden ref host so the IntersectionObserver has a DOM anchor.
  return (
    <>
      <span ref={ref} aria-hidden className="sr-only" />
      {fmt(n)}
    </>
  );
}
