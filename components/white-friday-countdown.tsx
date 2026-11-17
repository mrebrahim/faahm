'use client';

import { useEffect, useState } from 'react';

const CYCLE_MS = 6 * 60 * 60 * 1000;

export function WhiteFridayCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setRemaining(CYCLE_MS - (Date.now() % CYCLE_MS));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const seconds = remaining === null ? null : Math.ceil(remaining / 1000);
  const formatted = seconds === null ? '--:--:--' : [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ].map(part => String(part).padStart(2, '0')).join(':');

  return (
    <div className="mx-auto mt-6 max-w-md rounded-xl border border-red-300/40 bg-red-700 px-4 py-3 text-center text-white">
      <p className="text-sm font-bold">العدّاد التالي</p>
      <p className="mt-1 font-mono text-2xl font-black tracking-wider" dir="ltr" aria-label={`الوقت المتبقي ${formatted}`}>{formatted}</p>
      <p className="mt-1 text-xs text-red-100">العدّاد بيتجدد كل ٦ ساعات؛ لا يحدد انتهاء السعر.</p>
    </div>
  );
}
