'use client';

import { useEffect, useState } from 'react';

/**
 * Live 'offer ends in Xd Yh Zm Ws' countdown, driven by a server-supplied
 * deadline (milliseconds since epoch). Uses local requestAnimationFrame-
 * safe intervals so it never drifts on tab-switch. Refreshes the whole
 * page on hitting zero so the server re-computes the next cycle end and
 * hydrates a fresh countdown transparently.
 *
 * Compact by default so it fits inside the sitewide banner + inside the
 * popup card.
 */
export function PromoCountdown({
  deadlineMs,
  compact = false,
  onExpire,
}: {
  deadlineMs: number;
  compact?: boolean;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadlineMs - Date.now()));

  useEffect(() => {
    const t = setInterval(() => {
      const next = Math.max(0, deadlineMs - Date.now());
      setRemaining(next);
      if (next === 0) {
        clearInterval(t);
        if (onExpire) onExpire();
        // Full reload so the server hands us the new deadline (next month's 20th).
        // The redirect is safe because it's the SAME page.
        setTimeout(() => {
          if (typeof window !== 'undefined') window.location.reload();
        }, 800);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadlineMs, onExpire]);

  const { days, hours, minutes, seconds } = split(remaining);

  if (compact) {
    return (
      <span dir="ltr" className="inline-flex items-center gap-1 font-mono tabular-nums">
        <TimeChip value={days} label="ي" />
        <TimeChip value={hours} label="س" />
        <TimeChip value={minutes} label="د" />
        <TimeChip value={seconds} label="ث" />
      </span>
    );
  }

  return (
    <div dir="ltr" className="grid grid-cols-4 gap-2 tabular-nums">
      <BigChip value={days} label="يوم" />
      <BigChip value={hours} label="ساعة" />
      <BigChip value={minutes} label="دقيقة" />
      <BigChip value={seconds} label="ثانية" />
    </div>
  );
}

function split(ms: number) {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds };
}

function TimeChip({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="font-bold">{String(value).padStart(2, '0')}</span>
      <span className="text-[9px] opacity-70">{label}</span>
    </span>
  );
}

function BigChip({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center rounded-lg bg-white/10 backdrop-blur px-2 py-2">
      <div className="font-display text-2xl sm:text-3xl font-extrabold leading-none">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[10px] opacity-80 mt-1">{label}</div>
    </div>
  );
}
