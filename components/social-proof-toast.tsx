'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Live Social Proof Toast — periodic "X من <city> اشترك في العرض
 * السنوي" badge that surfaces on conversion pages (/pricing,
 * /checkout) to dampen hesitation by hinting at activity around the
 * visitor. Implements PRD §14:
 *
 *   - First toast at 10s, then every 25–40s (randomised).
 *   - Cap at 5 per browser session (sessionStorage flag).
 *   - Auto-dismiss at 5s desktop / 4s mobile, plus a manual close.
 *   - PAUSES the schedule the moment the visitor focuses any payment
 *     field — never interrupt a real intent-to-pay moment.
 *   - Names + cities are first-names only (Saudi cities), never real
 *     customer PII.
 *   - Lives in a fixed corner — never covers content, never opens an
 *     external link, never blocks the payment CTA.
 */

const FIRST_NAMES_M = [
  'أحمد', 'محمد', 'عبدالله', 'خالد', 'فهد', 'زهير', 'سعد',
  'بدر', 'تركي', 'يوسف', 'فيصل', 'ناصر', 'سلطان', 'عبدالعزيز',
];
const FIRST_NAMES_F = [
  'نورة', 'سارة', 'ريم', 'هند', 'لمى', 'مها', 'أمل',
  'دانة', 'منى', 'شهد', 'جواهر', 'لينا', 'رنا', 'غادة',
];
const CITIES = [
  'الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'الخبر',
  'الطائف', 'أبها', 'تبوك', 'بريدة', 'حائل', 'الجبيل', 'ينبع',
];

// Message templates — varied so the stream doesn't read as obviously
// generated. Each entry's pronoun + verb is gender-aware via the `f`
// flag. {name}, {city} get substituted at render time.
type Template = {
  icon: '✅' | '🔥' | '⭐';
  /** Build the message body for a given name. `f` = feminine form. */
  build: (name: string, city: string, f: boolean) => string;
  /** Weight — higher = picked more often. */
  weight: number;
};

const TEMPLATES: Template[] = [
  {
    icon: '✅',
    weight: 3,
    build: (n, c, f) =>
      `${n} من ${c} ${f ? 'اشتركت' : 'اشترك'} في العرض السنوي`,
  },
  {
    icon: '✅',
    weight: 2,
    build: (n, c, f) =>
      `${n} من ${c} ${f ? 'اشتركت' : 'اشترك'} في العرض الشهري`,
  },
  {
    icon: '🔥',
    weight: 3,
    build: (n, c, f) =>
      `${n} من ${c} ${f ? 'اشتركت' : 'اشترك'} في العرض السنوي — وفّر${
        f ? 'ت' : ''
      } 300 ر.س`,
  },
  {
    icon: '✅',
    weight: 1,
    build: (n, c, f) =>
      `${n} من ${c} ${f ? 'بدأت' : 'بدأ'} التعلّم مع فاهم`,
  },
  {
    icon: '⭐',
    weight: 1,
    build: (n, c, f) =>
      `${n} من ${c} ${f ? 'اشتركت' : 'اشترك'} في العرض السنوي`,
  },
  {
    icon: '✅',
    weight: 2,
    build: (n, c, f) =>
      `${n} من ${c} ${f ? 'اشتركت' : 'اشترك'} من ${
        Math.floor(Math.random() * 6) + 2
      } دقائق`,
  },
];

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function nextNotification(): { icon: string; text: string } {
  const isF = Math.random() < 0.4; // ~40% feminine names; tweak as needed.
  const pool = isF ? FIRST_NAMES_F : FIRST_NAMES_M;
  const name = pool[Math.floor(Math.random() * pool.length)];
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const tpl = pickWeighted(TEMPLATES);
  return { icon: tpl.icon, text: tpl.build(name, city, isF) };
}

const SESSION_KEY = 'faahm_socialproof_shown';
const MAX_PER_SESSION = 5;

const FIRST_DELAY_MS = 10_000;
const NEXT_DELAY_MIN_MS = 25_000;
const NEXT_DELAY_MAX_MS = 40_000;
const VISIBLE_MS_DESKTOP = 5_000;
const VISIBLE_MS_MOBILE = 4_000;

function readShown(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return Number(sessionStorage.getItem(SESSION_KEY) || '0') || 0;
  } catch {
    return 0;
  }
}

function bumpShown(): number {
  const n = readShown() + 1;
  try {
    sessionStorage.setItem(SESSION_KEY, String(n));
  } catch {
    // best effort
  }
  return n;
}

export function SocialProofToast() {
  const [current, setCurrent] = useState<{
    icon: string;
    text: string;
    key: number;
  } | null>(null);
  const scheduledTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  function clearTimers() {
    if (scheduledTimer.current) {
      clearTimeout(scheduledTimer.current);
      scheduledTimer.current = null;
    }
    if (visibleTimer.current) {
      clearTimeout(visibleTimer.current);
      visibleTimer.current = null;
    }
  }

  function scheduleNext(delayMs: number) {
    clearTimers();
    if (readShown() >= MAX_PER_SESSION) return;
    scheduledTimer.current = setTimeout(() => {
      // Re-check at fire time so a focus event that arrived during the
      // wait suppresses the toast.
      if (pausedRef.current) return;
      if (readShown() >= MAX_PER_SESSION) return;

      const n = nextNotification();
      const key = Date.now();
      setCurrent({ ...n, key });
      bumpShown();

      const isMobile =
        typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
      const visibleMs = isMobile ? VISIBLE_MS_MOBILE : VISIBLE_MS_DESKTOP;
      visibleTimer.current = setTimeout(() => {
        setCurrent(null);
        const next =
          NEXT_DELAY_MIN_MS +
          Math.random() * (NEXT_DELAY_MAX_MS - NEXT_DELAY_MIN_MS);
        scheduleNext(next);
      }, visibleMs);
    }, delayMs);
  }

  useEffect(() => {
    // Don't run if the visitor has already capped this session.
    if (readShown() >= MAX_PER_SESSION) return;

    // Start the first toast after the warm-up delay.
    scheduleNext(FIRST_DELAY_MS);

    // Pause the stream when the visitor is actively typing into a
    // payment field — never interrupt a real intent-to-pay moment.
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        pausedRef.current = true;
        clearTimers();
        setCurrent(null);
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        pausedRef.current = false;
        // Give the visitor a beat before bringing toasts back so it
        // doesn't feel like the stream was just paused.
        scheduleNext(FIRST_DELAY_MS);
      }
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    return () => {
      clearTimers();
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!current) return null;

  return (
    <div
      key={current.key}
      role="status"
      aria-live="polite"
      // bottom-end ⇒ bottom-LEFT in RTL (physically), opposite the
      // WhatsApp bubble's bottom-left LTR-physical = bottom-right RTL.
      // Safe-area inset baked in so iOS notch / home indicator don't
      // clip the toast.
      className="fixed end-4 z-40 max-w-[20rem] animate-[sp-in_0.35s_cubic-bezier(0.4,0,0.2,1)_both]"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
      }}
    >
      <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-gray-200 shadow-lg shadow-gray-900/10 ps-3 pe-2 py-2.5">
        <span aria-hidden className="text-base leading-none flex-shrink-0">
          {current.icon}
        </span>
        <span className="text-xs sm:text-sm text-gray-800 font-medium leading-snug truncate">
          {current.text}
        </span>
        <button
          type="button"
          onClick={() => {
            setCurrent(null);
            if (visibleTimer.current) {
              clearTimeout(visibleTimer.current);
              visibleTimer.current = null;
            }
            const next =
              NEXT_DELAY_MIN_MS +
              Math.random() * (NEXT_DELAY_MAX_MS - NEXT_DELAY_MIN_MS);
            scheduleNext(next);
          }}
          aria-label="إغلاق الإشعار"
          className="ms-1 flex-shrink-0 w-6 h-6 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 inline-flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <style>{`
        @keyframes sp-in {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
