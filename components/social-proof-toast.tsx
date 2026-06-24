'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Crown, Sparkles, CheckCircle2, BookOpen } from 'lucide-react';

/**
 * Live Social Proof Toast — periodic 'فلان من <city> اشترك في العرض
 * السنوي' badge that surfaces on conversion pages (/personal-plan,
 * /pricing, /checkout) to dampen hesitation by hinting at activity
 * around the visitor. Implements PRD §14:
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
 *
 * Visual: a wide pill with a coloured plan-icon chip on the right
 * (start in RTL), two stacked text rows (name + action), and a
 * footer line with relative time + 'مشترك مؤكَّد' badge. Modelled on
 * the SaaS social-proof pattern that puts a glyph for the *thing
 * bought* next to the buyer rather than a stock photo of the buyer.
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

type Plan = 'yearly' | 'monthly' | 'starter';

type Template = {
  /** Higher = picked more often. */
  weight: number;
  plan: Plan;
  /** Build the action body in Arabic, gender-aware. */
  build: (name: string, f: boolean) => string;
  /** Optional 'من N دقائق' suffix for the footer line. */
  timeAgo?: boolean;
};

const TEMPLATES: Template[] = [
  {
    weight: 3,
    plan: 'yearly',
    build: (_, f) => `${f ? 'اشتركت' : 'اشترك'} في العرض السنوي`,
  },
  {
    weight: 3,
    plan: 'yearly',
    build: (_, f) =>
      `${f ? 'اشتركت' : 'اشترك'} في العرض السنوي — وفّر${f ? 'ت' : ''} 300 ر.س`,
  },
  {
    weight: 2,
    plan: 'yearly',
    build: (_, f) => `${f ? 'اشتركت' : 'اشترك'} في العرض السنوي`,
    timeAgo: true,
  },
  {
    weight: 2,
    plan: 'monthly',
    build: (_, f) => `${f ? 'اشتركت' : 'اشترك'} في العرض الشهري`,
  },
  {
    weight: 2,
    plan: 'monthly',
    build: (_, f) => `${f ? 'اشتركت' : 'اشترك'} في العرض الشهري`,
    timeAgo: true,
  },
  {
    weight: 1,
    plan: 'starter',
    build: (_, f) => `${f ? 'بدأت' : 'بدأ'} التعلّم مع فاهم`,
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

type Notification = {
  name: string;
  city: string;
  action: string;
  plan: Plan;
  minutesAgo: number | null;
};

function nextNotification(): Notification {
  const isF = Math.random() < 0.4;
  const pool = isF ? FIRST_NAMES_F : FIRST_NAMES_M;
  const name = pool[Math.floor(Math.random() * pool.length)];
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const tpl = pickWeighted(TEMPLATES);
  return {
    name,
    city,
    plan: tpl.plan,
    action: tpl.build(name, isF),
    minutesAgo: tpl.timeAgo ? Math.floor(Math.random() * 6) + 2 : null,
  };
}

const PLAN_META: Record<
  Plan,
  { Icon: React.ComponentType<{ className?: string }>; bg: string; ring: string }
> = {
  yearly: {
    Icon: Crown,
    bg: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white',
    ring: 'ring-amber-200',
  },
  monthly: {
    Icon: Sparkles,
    bg: 'bg-gradient-to-br from-brand-400 to-brand-600 text-white',
    ring: 'ring-brand-200',
  },
  starter: {
    Icon: BookOpen,
    bg: 'bg-gradient-to-br from-indigo-400 to-indigo-600 text-white',
    ring: 'ring-indigo-200',
  },
};

const SESSION_KEY = 'faahm_socialproof_shown';
const MAX_PER_SESSION = 5;

const FIRST_DELAY_MS = 2_000;
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
    /* best effort */
  }
  return n;
}

export function SocialProofToast() {
  const [current, setCurrent] = useState<(Notification & { key: number }) | null>(null);
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
      if (pausedRef.current) return;
      if (readShown() >= MAX_PER_SESSION) return;

      const n = nextNotification();
      setCurrent({ ...n, key: Date.now() });
      bumpShown();

      const isMobile =
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 640px)').matches;
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
    if (readShown() >= MAX_PER_SESSION) return;
    scheduleNext(FIRST_DELAY_MS);

    // Pause the stream while the visitor types in a payment field
    // — never interrupt a real intent-to-pay moment.
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
  const meta = PLAN_META[current.plan];
  const PlanIcon = meta.Icon;

  return (
    <div
      key={current.key}
      role="status"
      aria-live="polite"
      // end-4 → bottom-LEFT in RTL physically. WhatsApp now sits on
      // the right, so the two never overlap. On mobile the StickyMobileCTA
      // rides on the very bottom (~80px tall + safe-area), so the toast
      // bumps itself ~5.5rem up to clear it. Above sm: there's no sticky
      // CTA, so the toast sits at the normal ~1rem inset.
      className="fixed end-4 z-40 w-[calc(100vw-2rem)] max-w-[22rem] bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] animate-[sp-in_0.35s_cubic-bezier(0.4,0,0.2,1)_both]"
    >
      <div className="relative rounded-2xl bg-white border border-gray-200 shadow-xl shadow-gray-900/15 pe-3 ps-4 py-3 flex items-center gap-3">
        {/* Plan icon chip — replaces the stock photo other social-proof
            toasts ship. Yearly gets a gold crown, monthly gets the
            brand sparkles, the starter "بدأ التعلّم" tail gets a book.
            currentColor on the SVG so a tone tweak doesn't break it. */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-full ring-4 ${meta.ring} ${meta.bg} flex items-center justify-center shadow-md`}
          aria-hidden
        >
          <PlanIcon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-foreground leading-tight">
            {current.name} <span className="text-gray-400 font-medium">من</span>{' '}
            {current.city}
          </div>
          <div className="text-xs text-gray-600 mt-0.5 leading-tight truncate">
            {current.action}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[10px]">
            {current.minutesAgo != null && (
              <span className="text-gray-400">من {current.minutesAgo} دقائق</span>
            )}
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
              <CheckCircle2 className="w-3 h-3" />
              مشترك مؤكَّد
            </span>
          </div>
        </div>

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
          className="absolute top-1.5 start-1.5 w-6 h-6 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 inline-flex items-center justify-center transition-colors"
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
