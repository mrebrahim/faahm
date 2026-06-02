'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import {
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Users2,
  Bot,
  Heart,
  ListChecks,
  Zap,
  Briefcase,
} from 'lucide-react';

/**
 * Sticky site header used on the marketing pages. Three responsibilities:
 *  1. Desktop nav with a hover/click dropdown for the four assessments
 *     so we don't keep adding top-level links every time a new test ships.
 *  2. Mobile slide-down panel triggered by a hamburger — the desktop
 *     nav is hidden on small screens.
 *  3. Auth-aware right-hand controls (login/signup vs dashboard/admin/
 *     signout) shared by both layouts.
 *
 * Auth is resolved server-side and passed in as props so this stays a
 * presentational client component.
 */
export function MainNav({
  signedIn,
  isAdmin,
}: {
  signedIn: boolean;
  isAdmin: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [testsOpen, setTestsOpen] = useState(false);
  const testsRef = useRef<HTMLDivElement | null>(null);

  // Close the desktop dropdown on outside click / Escape.
  useEffect(() => {
    if (!testsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (testsRef.current && !testsRef.current.contains(e.target as Node)) {
        setTestsOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTestsOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [testsOpen]);

  // Lock body scroll while the mobile panel is open.
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link href={ROUTES.home} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-lg shadow-lg shadow-brand-500/30">
            ف
          </div>
          <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href={ROUTES.courses} className="hover:text-foreground transition-colors">
            الكورسات
          </Link>
          <Link href={ROUTES.pricing} className="hover:text-foreground transition-colors">
            الأسعار
          </Link>
          <div className="relative" ref={testsRef}>
            <button
              type="button"
              onClick={() => setTestsOpen((v) => !v)}
              aria-expanded={testsOpen}
              aria-haspopup="true"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              الاختبارات
              <ChevronDown
                className={`w-4 h-4 transition-transform ${testsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {testsOpen && (
              <div
                role="menu"
                className="absolute top-full mt-2 end-0 w-72 rounded-2xl bg-white border border-gray-200 shadow-xl shadow-gray-900/5 p-2 z-50"
              >
                {TESTS.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    role="menuitem"
                    onClick={() => setTestsOpen(false)}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.iconBg}`}
                    >
                      <t.icon className={`w-4.5 h-4.5 ${t.iconColor}`} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-foreground">{t.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {t.subtitle}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/about" className="hover:text-foreground transition-colors">
            عن فاهم
          </Link>
        </nav>

        {/* Right side auth/dashboard buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {signedIn ? (
            <>
              {isAdmin && (
                <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
                  <Link href={ROUTES.admin}>لوحة الإدارة</Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={ROUTES.dashboard}>لوحتي</Link>
              </Button>
              <form action="/auth/signout" method="POST" className="hidden sm:block">
                <Button type="submit" variant="outline" size="sm">
                  خروج
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={ROUTES.login}>دخول</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={ROUTES.signup}>تسجيل</Link>
              </Button>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            aria-expanded={mobileOpen}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-600 hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <MobilePanel
          signedIn={signedIn}
          isAdmin={isAdmin}
          onClose={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}

function MobilePanel({
  signedIn,
  isAdmin,
  onClose,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="lg:hidden fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <div
        className="absolute top-0 inset-x-0 bg-white rounded-b-2xl shadow-xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between border-b border-gray-100">
          <Link href={ROUTES.home} onClick={onClose} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-600 hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-1">
          <MobileLink href={ROUTES.courses} label="الكورسات" onClick={onClose} />
          <MobileLink href={ROUTES.pricing} label="الأسعار" onClick={onClose} />

          <div className="pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3">
            الاختبارات
          </div>
          {TESTS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onClick={onClose}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.iconBg}`}
              >
                <t.icon className={`w-4.5 h-4.5 ${t.iconColor}`} />
              </span>
              <div className="min-w-0">
                <div className="font-bold text-sm text-foreground">{t.title}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {t.subtitle}
                </div>
              </div>
            </Link>
          ))}

          <div className="pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3">
            عام
          </div>
          <MobileLink href="/about" label="عن فاهم" onClick={onClose} />
          <MobileLink href="/help" label="مركز المساعدة" onClick={onClose} />
          <MobileLink href="/faq" label="أسئلة شائعة" onClick={onClose} />

          <div className="border-t border-gray-100 my-3" />

          {signedIn ? (
            <div className="space-y-2">
              {isAdmin && (
                <Button asChild variant="outline" className="w-full" onClick={onClose}>
                  <Link href={ROUTES.admin}>لوحة الإدارة</Link>
                </Button>
              )}
              <Button asChild className="w-full" onClick={onClose}>
                <Link href={ROUTES.dashboard}>لوحتي</Link>
              </Button>
              <form action="/auth/signout" method="POST">
                <Button type="submit" variant="outline" className="w-full">
                  خروج
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-2">
              <Button asChild className="w-full" onClick={onClose}>
                <Link href={ROUTES.signup}>سجّل حساب</Link>
              </Button>
              <Button asChild variant="outline" className="w-full" onClick={onClose}>
                <Link href={ROUTES.login}>دخول</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block p-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {label}
    </Link>
  );
}

/**
 * Canonical assessment list — single source of truth for both the
 * desktop dropdown and the mobile panel. Order matches the funnel:
 * career first (highest intent), then personality, then the
 * top-of-funnel AI readiness, then the soft self-discovery.
 */
const TESTS = [
  {
    href: '/career',
    title: 'التيست المهني',
    subtitle: 'اكتشف شغفك واتجاهك في 3 دقايق',
    icon: Sparkles,
    iconBg: 'bg-brand-500/10',
    iconColor: 'text-brand-600',
  },
  {
    href: '/personality',
    title: 'اختبار الشخصية',
    subtitle: 'نمطك من 16 نمط في 5 دقايق',
    icon: Users2,
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-600',
  },
  {
    href: '/ai-readiness',
    title: 'هل الـ AI هياخد شغلك؟',
    subtitle: 'تيست جاهزيتك للـ AI من 0 لـ 100',
    icon: Bot,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-600',
  },
  {
    href: '/self-discovery',
    title: 'اكتشاف الذات',
    subtitle: 'تيمات شغفك وأقرب كورس ليك',
    icon: Heart,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-600',
  },
  {
    href: '/ai-skills',
    title: 'إنت فين على سلّم الـ AI؟',
    subtitle: 'تحديد مستواك من 1 لـ 4 + الكورس اللي تبدأ بيه',
    icon: ListChecks,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600',
  },
  {
    href: '/productivity',
    title: 'ليه بتأجّل؟',
    subtitle: 'حدد اللي بيوقّفك + أول حركة في 10 دقايق',
    icon: Zap,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
  },
  {
    href: '/entrepreneurship',
    title: 'جاهز تكسب من الـ AI؟',
    subtitle: 'تيست الشغل الحر / البيزنس + الفجوة الأهم',
    icon: Briefcase,
    iconBg: 'bg-emerald-700/10',
    iconColor: 'text-emerald-700',
  },
];
