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
  Bot,
  Sparkles,
  Shield,
  Activity,
  Brain,
  Clock,
} from 'lucide-react';
import { AI_READINESS_QUESTIONS } from '@/lib/ai-readiness/questions';
import { tally } from '@/lib/ai-readiness/scoring';
import { getBand, DIMENSION_META } from '@/lib/ai-readiness/bands';
import {
  matchCoursesForReadiness,
  type AIReadinessMatch,
} from '@/lib/ai-readiness/matching';
import type { CatalogCourse } from '@/lib/career/matching';
import { DIMENSIONS } from '@/lib/ai-readiness/types';
import type {
  AIReadinessAnswer,
  AIReadinessResult,
  AnswerValue,
} from '@/lib/ai-readiness/types';
import { submitAIReadinessLead } from './actions';
import { OFFLINE_PAYMENTS } from '@/lib/constants';

type Stage = 'intro' | 'quiz' | 'calculating' | 'gate' | 'result';

export function AIReadinessFlow({ catalog }: { catalog: CatalogCourse[] }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState<AIReadinessAnswer[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = AI_READINESS_QUESTIONS.length;
  const currentQ = AI_READINESS_QUESTIONS[qIdx];
  const progress = (answers.length / total) * 100;

  const preview = useMemo(() => {
    if (answers.length < total) return null;
    const result = tally(answers);
    const band = getBand(result.band);
    const match = matchCoursesForReadiness(catalog, result);
    return { result, band, match };
  }, [answers, catalog, total]);

  function choose(value: AnswerValue) {
    const next: AIReadinessAnswer[] = [
      ...answers.filter((a) => a.questionId !== currentQ.id),
      { questionId: currentQ.id, value },
    ];
    setAnswers(next);
    if (qIdx + 1 < total) {
      setQIdx(qIdx + 1);
    } else {
      setStage('calculating');
      setTimeout(() => setStage('gate'), 1800);
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
      const res = await submitAIReadinessLead({ name, whatsapp, email, answers });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setConfirmed(true);
      setStage('result');
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-500/5">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
        {stage === 'intro' && <Intro onStart={() => setStage('quiz')} />}

        {stage === 'quiz' && currentQ && (
          <Quiz
            idx={qIdx}
            total={total}
            progress={progress}
            prompt={currentQ.prompt}
            options={currentQ.options}
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
    <div>
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-700 text-xs font-medium mb-5">
          <Bot className="w-3.5 h-3.5" />
          اختبار مبني بالذكاء الاصطناعي
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
          هل الـ AI
          <br />
          <span className="text-cyan-600">هياخد شغلك؟</span>
        </h1>
        <p className="text-gray-600 text-lg mb-2 max-w-xl mx-auto leading-relaxed">
          اختبار عميق مبني بالـ AI لقياس قدراتك الحقيقية في الذكاء الاصطناعي.
        </p>
        <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
          مش بنقيس "بتعرف AI ولا لأ" — بنقيس <strong>الخطر الحقيقي</strong>:
          طبيعة مهامك، موقعك الاقتصادي، وسرعة تكيّفك. حد بيعرف ChatGPT ممكن
          يكون في خطر أكبر من حد عمره ما فتحه — لو شغل التاني مبني على علاقات
          وثقة ومسؤولية.
        </p>
      </div>

      {/* What it measures */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 mb-6">
        <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">
          الـ 6 محاور اللي بنقيسها
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <DimChip icon={Activity} label="طبيعة المهام" weight="25%" />
          <DimChip icon={Activity} label="التعرّض الرقمي" weight="15%" />
          <DimChip icon={Bot} label="استخدام الـ AI" weight="20%" />
          <DimChip icon={Shield} label="الموقع الاقتصادي" weight="20%" />
          <DimChip icon={Brain} label="سرعة التكيّف" weight="15%" />
          <DimChip icon={Sparkles} label="العقلية" weight="5%" />
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat icon={Activity} label="30 سؤال" />
        <Stat icon={Clock} label="6-8 دقايق" />
        <Stat icon={Sparkles} label="نتيجة فورية" />
      </div>

      <div className="text-center">
        <Button
          size="lg"
          onClick={onStart}
          className="text-base px-8 py-6 bg-cyan-600 hover:bg-cyan-700"
        >
          <PlayCircle className="w-5 h-5" />
          ابدأ الاختبار
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <p className="text-xs text-gray-400 mt-6">
          مجاناً · بدون تسجيل · 30 سؤال مدروسين
        </p>
      </div>
    </div>
  );
}

function DimChip({
  icon: Icon,
  label,
  weight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  weight: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-cyan-50/50 border border-cyan-100">
      <Icon className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-xs font-bold truncate">{label}</div>
        <div className="text-[10px] text-cyan-700 font-mono" dir="ltr">{weight}</div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-cyan-600" />
      <div className="text-xs font-bold">{label}</div>
    </div>
  );
}

function Quiz({
  idx,
  total,
  progress,
  prompt,
  options,
  selected,
  onChoose,
  onBack,
}: {
  idx: number;
  total: number;
  progress: number;
  prompt: string;
  options: { label: string; value: AnswerValue }[];
  selected: AnswerValue | null;
  onChoose: (v: AnswerValue) => void;
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
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-8 shadow-sm">
        <h2 className="font-display text-lg sm:text-2xl font-bold mb-6 leading-relaxed">
          {prompt}
        </h2>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChoose(opt.value)}
              className={`w-full text-right p-4 rounded-xl border-2 transition-all text-sm sm:text-base leading-relaxed ${
                selected === opt.value
                  ? 'border-cyan-500 bg-cyan-500/5 text-cyan-700 font-medium'
                  : 'border-gray-200 bg-white hover:border-cyan-500/40 hover:bg-cyan-500/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
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
      <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-6" />
      <h2 className="font-display text-2xl font-bold mb-2">
        الـ AI بيحلّل إجاباتك على المحاور الـ 6…
      </h2>
      <p className="text-sm text-gray-500">
        بنحسب الخطر الحقيقي مش المعرفة السطحية
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
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">جاهزيتك للـ AI</p>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-2 leading-tight">
          {band.name_ar}
        </h2>
        <p className="text-sm opacity-90 leading-relaxed">{band.tagline_ar}</p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8">
        <h3 className="font-display text-xl font-bold mb-2">🎯 تقريرك جاهز</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          اكتب اسمك ورقم الواتساب نبعتلك التحليل الكامل للـ 6 محاور + الكورس
          اللي تبدأ بيه مساره.
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
            className="w-full bg-cyan-600 hover:bg-cyan-700"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحضير…
              </>
            ) : (
              <>
                شوف تحليلك الكامل
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
  result: AIReadinessResult;
  band: ReturnType<typeof getBand>;
  match: AIReadinessMatch;
  confirmed: boolean;
}) {
  const weakMeta = DIMENSION_META[result.weakest];
  const strongMeta = DIMENSION_META[result.strongest];
  const waMsg = `نقطي في تيست الجاهزية للـ AI: ${result.score}/100 (${band.name_ar}). أقوى محور: ${strongMeta.name_ar}. عاوز أعرف أكتر عن كورس ${match.primary?.title_ar ?? ''}`;
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
            <div className="font-display text-7xl font-extrabold leading-none">
              {result.score}
              <span className="text-3xl opacity-70">/100</span>
            </div>
          </div>
        </div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">جاهزيتك للـ AI</p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
          {band.name_ar}
        </h1>
        <p className="text-sm opacity-90 leading-relaxed">{band.description_ar}</p>
      </div>

      {/* 6 dimensions */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-1">المحاور الـ 6</h3>
        <p className="text-xs text-gray-500 mb-4">
          كل محور بيقيس جزء من الخطر الحقيقي — مش المعرفة السطحية.
        </p>
        <div className="space-y-4">
          {DIMENSIONS.map((d) => {
            const score = result.dimensions[d];
            const meta = DIMENSION_META[d];
            const isWeak = d === result.weakest;
            const isStrong = d === result.strongest;
            const color =
              score.pct >= 70
                ? 'bg-emerald-500'
                : score.pct >= 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500';
            return (
              <div key={d}>
                <div className="flex items-center justify-between mb-1.5 gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{meta.name_ar}</span>
                    {isStrong && (
                      <span className="text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
                        أقوى نقطة
                      </span>
                    )}
                    {isWeak && (
                      <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                        نقطة ضعف
                      </span>
                    )}
                  </div>
                  <div className="font-display text-sm font-bold whitespace-nowrap" dir="ltr">
                    {score.pct}%
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${color} transition-all`} style={{ width: `${score.pct}%` }} />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">{meta.short_ar}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weakest dimension callout */}
      {result.strongest !== result.weakest && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-5 sm:p-6">
          <p className="text-xs text-amber-800 font-bold uppercase tracking-wider mb-1">
            أهم نقطة تشتغل عليها
          </p>
          <h3 className="font-display text-xl font-bold text-amber-900 mb-2">
            {weakMeta.name_ar}
          </h3>
          <p className="text-sm text-amber-800 leading-relaxed">
            {weakMeta.growth_advice_ar}
          </p>
        </div>
      )}

      {/* Catch-up plan */}
      {match.primary && (
        <div className="rounded-2xl bg-white border-2 border-cyan-500/30 p-6 sm:p-8">
          <p className="text-xs text-cyan-700 font-medium mb-1">خطتك المخصصة</p>
          <h3 className="font-display text-xl font-bold mb-2">
            {band.catch_up_plan_intro}
          </h3>
          <div className="mt-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-4">
            <p className="text-xs text-cyan-700 font-medium mb-2">ابدأ بـ:</p>
            <h4 className="font-display text-lg font-bold mb-1">
              {match.primary.title_ar}
            </h4>
            {match.primary.short_description_ar && (
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {match.primary.short_description_ar}
              </p>
            )}
            <Button asChild size="lg" className="w-full bg-cyan-600 hover:bg-cyan-700">
              <Link href={`/course/${match.primary.slug}`}>
                <PlayCircle className="w-5 h-5" />
                ابدأ الكورس دلوقتي
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {(match.alsoExplore.length > 0 || match.addOn) && (
        <div>
          <h3 className="font-display text-lg font-bold mb-3">كمل خطتك بـ</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {match.alsoExplore.map((c) => (
              <CourseChip key={c.id} slug={c.slug} title={c.title_ar} />
            ))}
            {match.addOn && (
              <CourseChip
                slug={match.addOn.slug}
                title={match.addOn.title_ar}
                badge="إضافة أساسية"
              />
            )}
          </div>
        </div>
      )}

      {/* Cross-sell to career test */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-500/10 to-indigo-500/10 border border-brand-500/30 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-1">عرفت وضعك في الـ AI…</h3>
        <p className="text-sm text-gray-600 mb-3">
          تعرف شغفك المهني الحقيقي؟ خد التيست المهني وشوف مين أنت ومجالك إيه.
        </p>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/career">
            <Sparkles className="w-4 h-4" />
            خد التيست المهني
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
      className="group flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-colors"
    >
      <div className="min-w-0">
        {badge && (
          <span className="inline-block text-[10px] font-bold bg-cyan-500/10 text-cyan-700 px-1.5 py-0.5 rounded mb-1">
            {badge}
          </span>
        )}
        <div className="font-medium text-sm truncate">{title}</div>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-cyan-500 flex-shrink-0" />
    </Link>
  );
}
