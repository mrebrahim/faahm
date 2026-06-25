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
 *   - 2×2 grid on mobile, single horizontal row above sm:
 *   - Brand-green digits + a small lucide icon next to each number.
 *   - CountUp animates from 0 → final on viewport entry the first
 *     time only; respects prefers-reduced-motion and falls back to
 *     the locked final value when motion is reduced.
 *
 * No fake numbers, no fake counters: the `value` prop IS the locked
 * final figure. The animation is purely cosmetic over real data.
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
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Start the rendered count at the locked final value so SSR + the
  // first client paint agree (no hydration mismatch). The effect
  // then optionally re-tweens from 0 once the tile is on screen.
  const [current, setCurrent] = useState(value);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (animatedRef.current) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Reduced motion → leave the value at `value`, never tween.
    if (reduce) {
      animatedRef.current = true;
      return;
    }

    const host = hostRef.current;
    if (!host) return;

    let raf = 0;
    let start = 0;
    const DUR = 1200;
    const tween = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / DUR, 1);
      // easeOutCubic — fast start, gentle settle.
      const eased = 1 - Math.pow(1 - p, 3);
      setCurrent(value * eased);
      if (p < 1) raf = requestAnimationFrame(tween);
    };

    const startTween = () => {
      if (animatedRef.current) return;
      animatedRef.current = true;
      // Drop to 0 the frame before the tween, then animate up. Keeps
      // the visual story 'numbers count up from zero' without ever
      // showing 0 if JS is disabled (SSR shipped the final value).
      setCurrent(0);
      raf = requestAnimationFrame(tween);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startTween();
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(host);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  const display = current.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div
      ref={hostRef}
      className="flex flex-col items-center text-center gap-1 rounded-2xl border border-brand-500/15 bg-white px-3 py-4 shadow-sm sm:bg-transparent sm:border-transparent sm:shadow-none sm:py-2 sm:px-2"
    >
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
