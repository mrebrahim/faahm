'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircle,
  PlayCircle,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { ENTREPRENEURSHIP_QUESTIONS } from '@/lib/entrepreneurship/questions';
import { tally } from '@/lib/entrepreneurship/scoring';
import { getBand, DIMENSION_META } from '@/lib/entrepreneurship/bands';
import {
  matchCoursesForEntrepreneurship,
  type EntrepreneurshipMatch,
} from '@/lib/entrepreneurship/matching';
import type { CatalogCourse } from '@/lib/career/matching';
import { DIMENSIONS } from '@/lib/entrepreneurship/types';
import type {
  EntrepreneurshipAnswer,
  EntrepreneurshipResult,
  WorkType,
} from '@/lib/entrepreneurship/types';
import { submitEntrepreneurshipLead } from './actions';
import { OFFLINE_PAYMENTS } from '@/lib/constants';

type Stage = 'intro' | 'quiz' | 'calculating' | 'gate' | 'result';

export function EntrepreneurshipFlow({ catalog }: { catalog: CatalogCourse[] }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState<EntrepreneurshipAnswer[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = ENTREPRENEURSHIP_QUESTIONS.length;
  const currentQ = ENTREPRENEURSHIP_QUESTIONS[qIdx];
  const progress = (answers.length / total) * 100;

  const preview = useMemo(() => {
    if (answers.length < total) return null;
    const result = tally(answers);
    const band = getBand(result.band);
    const match = matchCoursesForEntrepreneurship(catalog, result);
    return { result, band, match };
  }, [answers, catalog, total]);

  function choose(value: 0 | 1 | 2 | 3 | WorkType) {
    const next: EntrepreneurshipAnswer[] = [
      ...answers.filter((a) => a.questionId !== currentQ.id),
      { questionId: currentQ.id, value },
    ];
    setAnswers(next);
    if (qIdx + 1 < total) {
      setQIdx(qIdx + 1);
    } else {
      setStage('calculating');
      setTimeout(() => setStage('gate'), 1600);
    }
  }

  function back() {
    if (qIdx === 0) return setStage('intro');
    setQIdx(qIdx - 1);
  }

  function onLeadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '');
    const whatsapp = String(fd.get('whatsapp') || '');
    const email = String(fd.get('email') || '') || null;
    startTransition(async () => {
      const res = await submitEntrepreneurshipLead({ name, whatsapp, email, answers });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setConfirmed(true);
      setStage('result');
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
        {stage === 'intro' && <Intro onStart={() => setStage('quiz')} />}

        {stage === 'quiz' && currentQ && (
          <Quiz
            idx={qIdx}
            total={total}
            progress={progress}
            question={currentQ}
            selected={
              answers.find((a) => a.questionId === currentQ.id)?.value ?? null
            }
            onChoose={choose}
            onBack={back}
          />
        )}

        {stage === 'calculating' && <Calculating />}

        {stage === 'gate' && preview && (
          <Gate
            score={preview.result.score}
            band={preview.band}
            pending={pending}
            err={err}
            onSubmit={onLeadSubmit}
          />
        )}

        {stage === 'result' && preview && (
          <Result
            result={preview.result}
            band={preview.band}
            match={preview.match}
            confirmed={confirmed}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================================ */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/10 text-emerald-800 text-xs font-medium mb-5">
        <Briefcase className="w-3.5 h-3.5" />
        15 سؤال · 4 دقايق
      </span>
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
        جاهز
        <br />
        <span className="text-emerald-700">تكسب من الـ AI؟</span>
      </h1>
      <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
        تيست عملي يحدّد جاهزيتك للشغل الحر / البيزنس من 0 لـ 100، ويقولك
        بالظبط أكبر فجوة عندك تشد عليها — وأقرب كورس يبدأ بيه طريقك.
      </p>
      <Button
        size="lg"
        onClick={onStart}
        className="text-base px-8 py-6 bg-emerald-700 hover:bg-emerald-800"
      >
        <PlayCircle className="w-5 h-5" />
        ابدأ التقييم
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <p className="text-xs text-gray-400 mt-6">
        مجاناً · بدون تسجيل · نتيجة فورية
      </p>
    </div>
  );
}

function Quiz({
  idx,
  total,
  progress,
  question,
  selected,
  onChoose,
  onBack,
}: {
  idx: number;
  total: number;
  progress: number;
  question: (typeof ENTREPRENEURSHIP_QUESTIONS)[number];
  selected: 0 | 1 | 2 | 3 | WorkType | null;
  onChoose: (v: 0 | 1 | 2 | 3 | WorkType) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>سؤال {idx + 1} من {total}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-emerald-700 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm">
        <h2 className="font-display text-xl sm:text-2xl font-bold mb-6 leading-relaxed">
          {question.prompt}
        </h2>
        <div className="space-y-3">
          {question.options.map((opt, i) => {
            const isSelected = selected === (opt as any).value;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChoose((opt as any).value)}
                className={`w-full text-right p-4 sm:p-5 rounded-xl border-2 transition-all text-sm sm:text-base leading-relaxed ${
                  isSelected
                    ? 'border-emerald-700 bg-emerald-700/5 text-emerald-800 font-medium'
                    : 'border-gray-200 bg-white hover:border-emerald-700/40 hover:bg-emerald-700/5'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowRight className="w-4 h-4" />
          {idx === 0 ? 'رجوع للبداية' : 'السؤال السابق'}
        </button>
      </div>
    </div>
  );
}

function Calculating() {
  return (
    <div className="text-center py-20">
      <Loader2 className="w-12 h-12 text-emerald-700 animate-spin mx-auto mb-6" />
      <h2 className="font-display text-2xl font-bold mb-2">
        بنحسب جاهزيتك للشغل الحر…
      </h2>
      <p className="text-sm text-gray-500">
        بنحدد فجواتك على الأبعاد الـ 5
      </p>
    </div>
  );
}

function Gate({
  score,
  band,
  pending,
  err,
  onSubmit,
}: {
  score: number;
  band: ReturnType<typeof getBand>;
  pending: boolean;
  err: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div>
      <div className={`rounded-2xl p-6 sm:p-8 mb-6 text-white bg-gradient-to-br ${band.colorClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-5xl">{band.emoji}</div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider opacity-80 mb-0.5">
              نقطك
            </p>
            <div className="font-display text-5xl font-extrabold leading-none">
              {score}
              <span className="text-2xl opacity-70">/100</span>
            </div>
          </div>
        </div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
          جاهزيتك للشغل الحر
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-2 leading-tight">
          {band.name_ar}
        </h2>
        <p className="text-sm opacity-90 leading-relaxed">{band.tagline_ar}</p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8">
        <h3 className="font-display text-xl font-bold mb-2">💼 خطتك التفصيلية جاهزة</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          اكتب اسمك ورقم الواتساب نبعتلك التحليل الكامل + الفجوة الأهم والكورس
          اللي يبني بها.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم</Label>
            <Input id="name" name="name" required autoComplete="name" placeholder="اسمك" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">رقم الواتساب</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              required
              dir="ltr"
              className="text-left"
              placeholder="+20 1XXXXXXXXX"
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">الإيميل (اختياري)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              dir="ltr"
              className="text-left"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {err && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {err}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full bg-emerald-700 hover:bg-emerald-800"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحضير…
              </>
            ) : (
              <>
                شوف خطتك الكاملة
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Result({
  result,
  band,
  match,
  confirmed,
}: {
  result: EntrepreneurshipResult;
  band: ReturnType<typeof getBand>;
  match: EntrepreneurshipMatch;
  confirmed: boolean;
}) {
  const gapMeta = DIMENSION_META[result.biggestGap];
  const waMsg = `جاهزيتي للشغل الحر: ${result.score}/100 (${band.name_ar.split('—')[0].trim()}). أكبر فجوة: ${gapMeta.name_ar}. عاوز أعرف أكتر عن كورس ${match.primary?.title_ar ?? ''}`;
  const waHref = `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="space-y-6">
      {confirmed && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          تم حفظ نتيجتك! هنبعتلك التفاصيل على واتساب.
        </div>
      )}

      {/* Score + band */}
      <div className={`rounded-2xl p-6 sm:p-8 text-white bg-gradient-to-br ${band.colorClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-6xl">{band.emoji}</div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider opacity-80 mb-0.5">
              نقطك
            </p>
            <div className="font-display text-6xl font-extrabold leading-none">
              {result.score}
              <span className="text-3xl opacity-70">/100</span>
            </div>
          </div>
        </div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
          جاهزيتك للشغل الحر
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold mb-2 leading-tight">
          {band.name_ar}
        </h1>
        <p className="text-sm opacity-90 leading-relaxed">{band.description_ar}</p>
      </div>

      {/* Biggest gap callout */}
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-5 sm:p-6">
        <p className="text-xs text-amber-800 font-bold uppercase tracking-wider mb-1">
          أكبر فجوة عندك
        </p>
        <h3 className="font-display text-xl font-bold text-amber-900 mb-2">
          {gapMeta.name_ar}
        </h3>
        <p className="text-sm text-amber-800 leading-relaxed">{gapMeta.gap_advice_ar}</p>
      </div>

      {/* Dimension breakdown */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-4">الأبعاد الخمسة</h3>
        <div className="space-y-3">
          {DIMENSIONS.map((d) => {
            const score = result.dimensions[d];
            const meta = DIMENSION_META[d];
            const isGap = d === result.biggestGap;
            const color =
              score.pct >= 70
                ? 'bg-emerald-500'
                : score.pct >= 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500';
            return (
              <div key={d}>
                <div className="flex items-center justify-between mb-1.5 gap-3">
                  <span className="text-sm font-medium flex items-center gap-2 truncate">
                    {meta.name_ar}
                    {isGap && (
                      <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                        أهم فجوة
                      </span>
                    )}
                  </span>
                  <span className="font-display text-sm font-bold whitespace-nowrap" dir="ltr">
                    {score.pct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${color} transition-all`} style={{ width: `${score.pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next step + primary course */}
      {match.primary && (
        <div className="rounded-2xl bg-white border-2 border-emerald-700/30 p-6 sm:p-8">
          {match.unclearWork && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
              لسه مش متأكد إزاي تكسب من الـ AI؟ ابدأ بكورس اكتشاف الشغف وضّح
              اتجاهك الأول.
            </p>
          )}
          <p className="text-xs text-emerald-700 font-medium mb-1">الخطوة الجاية</p>
          <h3 className="font-display text-xl font-bold mb-2">{band.next_step_ar}</h3>
          <div className="mt-4 rounded-xl bg-emerald-700/5 border border-emerald-700/20 p-4">
            <p className="text-xs text-emerald-700 font-medium mb-2">ابدأ بـ:</p>
            <h4 className="font-display text-lg font-bold mb-1">
              {match.primary.title_ar}
            </h4>
            {match.primary.short_description_ar && (
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {match.primary.short_description_ar}
              </p>
            )}
            <Button asChild size="lg" className="w-full bg-emerald-700 hover:bg-emerald-800">
              <Link href={`/course/${match.primary.slug}`}>
                <PlayCircle className="w-5 h-5" />
                ابدأ الكورس
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {(match.alsoExplore.length > 0 || match.addOn) && (
        <div>
          <h3 className="font-display text-lg font-bold mb-3">سدّ الفجوة كمان بـ</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {match.alsoExplore.map((c) => (
              <CourseChip key={c.id} slug={c.slug} title={c.title_ar} />
            ))}
            {match.addOn && (
              <CourseChip
                slug={match.addOn.slug}
                title={match.addOn.title_ar}
                badge="أساس الـ AI"
              />
            )}
          </div>
        </div>
      )}

      {/* Cross-sell to AI Skills */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-1">عرفت جاهزيتك للشغل…</h3>
        <p className="text-sm text-gray-600 mb-3">
          تعرف فين على سلّم الـ AI؟ خد تيست المستوى عشان تعرف الكورس المظبوط.
        </p>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/ai-skills">
            <Sparkles className="w-4 h-4" />
            خد تيست المستوى
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold text-sm transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        كلّم فريق فاهم على واتساب
      </a>
    </div>
  );
}

function CourseChip({
  slug,
  title,
  badge,
}: {
  slug: string;
  title: string;
  badge?: string;
}) {
  return (
    <Link
      href={`/course/${slug}`}
      className="group flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-emerald-700/40 hover:bg-emerald-700/5 transition-colors"
    >
      <div className="min-w-0">
        {badge && (
          <span className="inline-block text-[10px] font-bold bg-emerald-700/10 text-emerald-700 px-1.5 py-0.5 rounded mb-1">
            {badge}
          </span>
        )}
        <div className="font-medium text-sm truncate">{title}</div>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-emerald-700 flex-shrink-0" />
    </Link>
  );
}
