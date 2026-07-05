'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Bot,
  Video,
  Code,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  PlayCircle,
  Star,
} from 'lucide-react';
import { postServerEvent, getSessionEventId } from '@/lib/client-tracking';

/**
 * 3-question recommender quiz on /personal-plan. The PRD's lead-magnet
 * replacement: no email gate, just three taps that produce a real
 * recommendation + a path of three preview-able courses and end with
 * a yearly-plan CTA. The quiz is sticky content (Clarity showed the
 * visitor will tap-tap-tap once a quiz starts) but lives below the
 * fold-of-1 so it can't crowd out the price + CTA above.
 *
 * Track every step so the merchant can prove the quiz earned its
 * vertical inches:
 *   quiz_start          on first option tap
 *   quiz_q1 / q2 / q3   one fire per answer (with the answer value)
 *   quiz_complete       on reaching the result screen
 *   quiz_to_checkout    when the result CTA is clicked
 *
 * Events go through the existing GA4 / FB / TikTok client snippets
 * AND the postServerEvent CAPI bridge so iOS / ad-blocker traffic
 * still counts.
 */

type Answer1 = 'automation' | 'video' | 'coding' | 'unsure';
type Answer2 = 'beginner' | 'basics' | 'intermediate';
type Answer3 = 'earn' | 'work' | 'curious';

type CourseSlug = 'n8n' | 'ai-video' | 'vibe-coding';

type Course = {
  slug: CourseSlug;
  title: string;
  lessons: number;
  icon: 'bot' | 'video' | 'code';
  /** Used for the rationale paragraph on the result screen. */
  pitch: string;
};

const COURSES: Record<CourseSlug, Course> = {
  n8n: {
    slug: 'n8n',
    title: 'n8n Automation',
    lessons: 81,
    icon: 'bot',
    pitch:
      'الأتمتة بـ n8n هي أسرع طريقة تحوّل المهارة لفلوس — كل شركة محتاجة Workflows تشتغل بالـ AI لوحدها.',
  },
  'ai-video': {
    slug: 'ai-video',
    title: 'AI Video',
    lessons: 52,
    icon: 'video',
    pitch:
      'فيديوهات بالـ AI طلب السوق فيها فوق العرض — هتنتج محتوى احترافي بدون كاميرا ولا استوديو.',
  },
  'vibe-coding': {
    slug: 'vibe-coding',
    title: 'Vibe Coding',
    lessons: 40,
    icon: 'code',
    pitch:
      'تبني تطبيقات وأدوات حقيقية بمساعدة AI، حتى لو مبتدئ في البرمجة — أهم مهارة في 2026.',
  },
};

const PATH: Record<CourseSlug, Course[]> = {
  n8n: [COURSES.n8n, COURSES['vibe-coding'], COURSES['ai-video']],
  'ai-video': [COURSES['ai-video'], COURSES.n8n, COURSES['vibe-coding']],
  'vibe-coding': [COURSES['vibe-coding'], COURSES.n8n, COURSES['ai-video']],
};

const ICON_MAP = { bot: Bot, video: Video, code: Code };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      page: () => void;
      track: (event: string, data?: unknown) => void;
      load: (id: string) => void;
    };
  }
}

function track(event: string, params: Record<string, unknown> = {}) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, params);
    }
  } catch {/* */}
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', event, params);
    }
  } catch {/* */}
  try {
    if (window.ttq?.track) {
      window.ttq.track(event, params);
    }
  } catch {/* */}
}

export function PersonalPlanQuiz() {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [a1, setA1] = useState<Answer1 | null>(null);
  const [a2, setA2] = useState<Answer2 | null>(null);
  const [a3, setA3] = useState<Answer3 | null>(null);
  const startedRef = useRef(false);
  const completeRef = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // When the result screen renders, fire the completion event once.
  useEffect(() => {
    if (step === 4 && !completeRef.current && a1) {
      completeRef.current = true;
      track('quiz_complete', { primary: a1, level: a2, goal: a3 });
    }
  }, [step, a1, a2, a3]);

  // Scroll-into-view on advance so the next question always lands on
  // the visitor's screen on mobile.
  useEffect(() => {
    if (step === 0) return;
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  function advance(next: 1 | 2 | 3 | 4) {
    if (!startedRef.current) {
      startedRef.current = true;
      track('quiz_start');
    }
    setStep(next);
  }

  function reset() {
    setStep(0);
    setA1(null);
    setA2(null);
    setA3(null);
    startedRef.current = false;
    completeRef.current = false;
  }

  const recommendedSlug: CourseSlug | null =
    a1 === 'automation'
      ? 'n8n'
      : a1 === 'video'
        ? 'ai-video'
        : a1 === 'coding'
          ? 'vibe-coding'
          : a1 === 'unsure'
            ? 'n8n'
            : null;

  const path = recommendedSlug ? PATH[recommendedSlug] : [];
  const progress = step <= 3 ? Math.max(0, step - 1) * 33 + (step > 0 ? 1 : 0) : 100;

  return (
    <section
      id="quiz"
      ref={rootRef}
      className="relative px-4 py-10 sm:py-14 border-t border-gray-100 scroll-mt-20"
    >
      <div className="container mx-auto max-w-2xl">
        <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/5 to-white p-5 sm:p-7 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-2 text-brand-700">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold text-sm sm:text-base">
                اكتشف كورسك المثالي
              </span>
            </div>
            {step > 0 && step < 4 && (
              <span className="text-xs text-gray-500 font-medium tabular-nums">
                {step} / 3
              </span>
            )}
          </div>

          {/* Progress bar */}
          {step > 0 && step < 4 && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-5">
              <div
                className="h-full bg-brand-500 transition-all duration-300 rounded-full"
                style={{ width: `${(step / 3) * 100}%` }}
                aria-hidden
              />
            </div>
          )}

          {/* Step 0 — intro */}
          {step === 0 && (
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-extrabold leading-snug mb-2">
                مش عارف تبدأ منين؟ جاوب 3 أسئلة بسيطة.
              </h3>
              <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                ⏱️ خلال 30 ثانية — هنرشّحلك الكورس الأنسب لمستواك وهدفك،
                وخطة تعلّم من 3 كورسات بمعاينات مجانية.
              </p>
              <button
                type="button"
                onClick={() => advance(1)}
                className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base transition-colors"
              >
                ابدأ الاختبار
                <ArrowLeft className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-gray-400 text-center mt-3">
                مفيش إيميل ولا تسجيل · مفيش بيانات بنحفظها
              </p>
            </div>
          )}

          {/* Q1 — What */}
          {step === 1 && (
            <Question
              title="إيه اللي عايز تتعلّمه الأول؟"
              options={[
                {
                  value: 'automation' as Answer1,
                  icon: Bot,
                  label: 'الأتمتة بالـ AI (n8n)',
                  sub: 'تخلّي AI يشغّل المهام بدلك',
                },
                {
                  value: 'video' as Answer1,
                  icon: Video,
                  label: 'صناعة الفيديو بالـ AI',
                  sub: 'محتوى احترافي بدون كاميرا',
                },
                {
                  value: 'coding' as Answer1,
                  icon: Code,
                  label: 'البرمجة (Vibe Coding)',
                  sub: 'تطبيقات وأدوات بمساعدة AI',
                },
                {
                  value: 'unsure' as Answer1,
                  icon: HelpCircle,
                  label: 'لسه مش عارف',
                  sub: 'هنبدأ معاك من الصفر',
                },
              ]}
              onPick={(v) => {
                setA1(v);
                track('quiz_q1', { answer: v });
                advance(2);
              }}
            />
          )}

          {/* Q2 — Level */}
          {step === 2 && (
            <Question
              title="مستواك الحالي إيه؟"
              options={[
                { value: 'beginner' as Answer2, label: 'مبتدئ تماماً', sub: 'مش شغّلت AI قبل كده' },
                { value: 'basics' as Answer2, label: 'عندي أساسيات', sub: 'استخدمت ChatGPT و أدوات بسيطة' },
                { value: 'intermediate' as Answer2, label: 'متوسط', sub: 'بنيت حاجات صغيرة قبل كده' },
              ]}
              onPick={(v) => {
                setA2(v);
                track('quiz_q2', { answer: v });
                advance(3);
              }}
            />
          )}

          {/* Q3 — Goal */}
          {step === 3 && (
            <Question
              title="هدفك الأساسي إيه؟"
              options={[
                { value: 'earn' as Answer3, label: 'أكسب فلوس / Freelance', sub: 'أحوّل المهارة لدخل' },
                { value: 'work' as Answer3, label: 'أطوّر شغلي الحالي', sub: 'AI داخل تخصصي' },
                { value: 'curious' as Answer3, label: 'فضول وتعلّم', sub: 'حابب أفهم الـ AI' },
              ]}
              onPick={(v) => {
                setA3(v);
                track('quiz_q3', { answer: v });
                advance(4);
              }}
            />
          )}

          {/* Result */}
          {step === 4 && recommendedSlug && (
            <div>
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-1 text-amber-500 mb-2">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </div>
                <p className="text-xs uppercase tracking-wider text-brand-700 font-bold mb-1">
                  خطتك جاهزة
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight mb-2">
                  ابدأ بـ <span className="text-gradient-brand">{COURSES[recommendedSlug].title}</span>
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                  {COURSES[recommendedSlug].pitch}
                </p>
              </div>

              {/* Path: 3 courses with preview buttons */}
              <div className="space-y-2.5 mb-5">
                {path.map((c, i) => {
                  const Icon = ICON_MAP[c.icon];
                  return (
                    <Link
                      key={c.slug}
                      href={`/course/${c.slug}`}
                      onClick={() =>
                        track('quiz_preview_click', { slug: c.slug, position: i + 1 })
                      }
                      className="group flex items-center gap-3 rounded-xl border border-gray-200 hover:border-brand-500/40 bg-white p-3 sm:p-4 transition-all"
                    >
                      <span className="w-7 h-7 rounded-full bg-brand-500/15 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm sm:text-base text-foreground truncate">
                          {c.title}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {c.lessons} درس · بالعربي
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:text-brand-700 whitespace-nowrap">
                        <PlayCircle className="w-4 h-4" />
                        معاينة
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Offer + CTA */}
              <div className="rounded-xl border border-brand-500/30 bg-white p-4 mb-3 text-center">
                <p className="text-sm text-gray-700 leading-relaxed mb-1">
                  ادرس دول{' '}
                  <span className="font-bold text-foreground">
                    وكل كورسات فاهم
                  </span>{' '}
                  بـ
                </p>
                <p className="font-display text-3xl sm:text-4xl font-extrabold text-brand-700 mb-1">
                  $40 <span className="text-base text-gray-500 font-medium">/ سنة</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  اشتراك واحد يفتح كل الكورسات · ضمان 7 أيام
                </p>
              </div>

              <Link
                href="/checkout?plan=yearly"
                onClick={() => {
                  const eventId = getSessionEventId('quiz_to_checkout');
                  track('quiz_to_checkout', {
                    primary: a1,
                    level: a2,
                    goal: a3,
                    recommended: recommendedSlug,
                  });
                  postServerEvent({
                    eventName: 'Lead',
                    eventId,
                    contentName: `quiz-${recommendedSlug}`,
                  });
                }}
                className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base transition-colors"
              >
                ابدأ خطتي الشخصية
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-gray-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                ضمان استرجاع 7 أيام · إلغاء في أي وقت
              </div>

              <button
                type="button"
                onClick={reset}
                className="mt-4 mx-auto flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 underline"
              >
                <RotateCcw className="w-3 h-3" />
                إعادة الاختبار
              </button>
            </div>
          )}
        </div>
      </div>
      <span className="sr-only">{progress}% complete</span>
    </section>
  );
}

function Question<T extends string>({
  title,
  options,
  onPick,
}: {
  title: string;
  options: {
    value: T;
    label: string;
    sub?: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  onPick: (v: T) => void;
}) {
  return (
    <div>
      <h3 className="font-display text-xl sm:text-2xl font-extrabold leading-snug mb-4">
        {title}
      </h3>
      <div className="flex flex-col gap-2.5">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onPick(opt.value)}
              className="group w-full text-start flex items-center gap-3 rounded-xl border border-gray-200 hover:border-brand-500 hover:bg-brand-500/5 bg-white px-4 py-3 sm:py-3.5 transition-all min-h-[56px]"
            >
              {Icon && (
                <span className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4" />
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm sm:text-base text-foreground">
                  {opt.label}
                </span>
                {opt.sub && (
                  <span className="block text-[11px] sm:text-xs text-gray-500 mt-0.5">
                    {opt.sub}
                  </span>
                )}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-600 flex-shrink-0 transition-colors rtl:rotate-180" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
