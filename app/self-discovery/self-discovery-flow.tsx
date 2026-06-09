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
  Heart,
  Sparkles,
} from 'lucide-react';
import { SELF_DISCOVERY_QUESTIONS } from '@/lib/self-discovery/questions';
import { tally, isWeakProfile } from '@/lib/self-discovery/scoring';
import { getTheme, THEMES } from '@/lib/self-discovery/themes';
import {
  matchCoursesForSelfDiscovery,
  type SelfDiscoveryMatch,
} from '@/lib/self-discovery/matching';
import type { CatalogCourse } from '@/lib/career/matching';
import type {
  SelfDiscoveryAnswer,
  SelfDiscoveryResult,
  ThemeId,
} from '@/lib/self-discovery/types';
import { submitSelfDiscoveryLead } from './actions';
import { OFFLINE_PAYMENTS } from '@/lib/constants';

type Stage = 'intro' | 'quiz' | 'calculating' | 'gate' | 'result';

export function SelfDiscoveryFlow({ catalog }: { catalog: CatalogCourse[] }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState<SelfDiscoveryAnswer[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [reflectionText, setReflectionText] = useState('');
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = SELF_DISCOVERY_QUESTIONS.length;
  const currentQ = SELF_DISCOVERY_QUESTIONS[qIdx];
  const progress = (answers.length / total) * 100;

  const preview = useMemo(() => {
    // Reflections are optional — once every choice question is answered we
    // can render the preview; reflection texts just enrich the stored record.
    const choiceQs = SELF_DISCOVERY_QUESTIONS.filter((q) => q.kind === 'choice');
    const choiceAnswered = answers.filter(
      (a) => 'optionIndex' in a && choiceQs.some((q) => q.id === a.questionId)
    ).length;
    if (choiceAnswered < choiceQs.length) return null;
    const result = tally(answers);
    const match = matchCoursesForSelfDiscovery(catalog, result);
    return { result, match };
  }, [answers, catalog]);

  function recordAnswer(answer: SelfDiscoveryAnswer) {
    const next: SelfDiscoveryAnswer[] = [
      ...answers.filter((a) => a.questionId !== answer.questionId),
      answer,
    ];
    setAnswers(next);
    setReflectionText('');
    if (qIdx + 1 < total) {
      setQIdx(qIdx + 1);
    } else {
      setStage('calculating');
      setTimeout(() => setStage('gate'), 1600);
    }
  }

  function chooseOption(optionIndex: number) {
    recordAnswer({ questionId: currentQ.id, optionIndex });
  }

  function submitReflection() {
    recordAnswer({ questionId: currentQ.id, text: reflectionText });
  }

  function skipReflection() {
    // Skipping is a no-op record so the index advances; we don't store the row.
    if (qIdx + 1 < total) {
      setReflectionText('');
      setQIdx(qIdx + 1);
    } else {
      setStage('calculating');
      setTimeout(() => setStage('gate'), 1600);
    }
  }

  function back() {
    if (qIdx === 0) return setStage('intro');
    setReflectionText('');
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
      const res = await submitSelfDiscoveryLead({ name, whatsapp, email, answers });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setConfirmed(true);
      setStage('result');
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
        {stage === 'intro' && <Intro onStart={() => setStage('quiz')} />}

        {stage === 'quiz' && currentQ && currentQ.kind === 'choice' && (
          <ChoiceQuestion
            idx={qIdx}
            total={total}
            progress={progress}
            prompt={currentQ.prompt}
            options={currentQ.options.map((o) => o.label)}
            selected={
              (answers.find((a) => a.questionId === currentQ.id) as
                | { optionIndex: number }
                | undefined)?.optionIndex ?? null
            }
            onChoose={chooseOption}
            onBack={back}
          />
        )}

        {stage === 'quiz' && currentQ && currentQ.kind === 'reflection' && (
          <ReflectionQuestion
            idx={qIdx}
            total={total}
            progress={progress}
            prompt={currentQ.prompt}
            placeholder={currentQ.placeholder}
            text={reflectionText}
            onChange={setReflectionText}
            onSkip={skipReflection}
            onContinue={submitReflection}
            onBack={back}
          />
        )}

        {stage === 'calculating' && <Calculating />}

        {stage === 'gate' && preview && (
          <Gate result={preview.result} pending={pending} err={err} onSubmit={onLeadSubmit} />
        )}

        {stage === 'result' && preview && (
          <Result
            result={preview.result}
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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 text-xs font-medium mb-5">
        <Heart className="w-3.5 h-3.5" />
        14 سؤال · 5 دقايق
      </span>
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
        اكتشاف
        <br />
        <span className="text-rose-600">شغفك الداخلي</span>
      </h1>
      <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
        أسئلة عميقة بسيطة تكشف اللي بيشدّك من جوّاك — اللي تحبه حتى لو محدش
        دفعلك. هتطلع مع بروفايل شغفك (أعلى تيمات) والخطوة الجاية تبدأ بيها.
      </p>
      <Button
        size="lg"
        onClick={onStart}
        className="text-base px-8 py-6 bg-rose-600 hover:bg-rose-700"
      >
        <PlayCircle className="w-5 h-5" />
        ابدأ الرحلة
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <p className="text-xs text-gray-400 mt-6">
        مجاناً · بدون تسجيل · نتيجة فورية
      </p>
    </div>
  );
}

function ProgressHeader({ idx, total, progress }: { idx: number; total: number; progress: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>سؤال {idx + 1} من {total}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-rose-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ChoiceQuestion({
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
  options: string[];
  selected: number | null;
  onChoose: (i: number) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <ProgressHeader idx={idx} total={total} progress={progress} />

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm">
        <h2 className="font-display text-xl sm:text-2xl font-bold mb-6 leading-relaxed">
          {prompt}
        </h2>
        <div className="space-y-3">
          {options.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChoose(i)}
              className={`w-full text-right p-4 sm:p-5 rounded-xl border-2 transition-all text-sm sm:text-base leading-relaxed ${
                selected === i
                  ? 'border-rose-500 bg-rose-500/5 text-rose-700 font-medium'
                  : 'border-gray-200 bg-white hover:border-rose-500/40 hover:bg-rose-500/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <BackButton onBack={onBack} idx={idx} />
      </div>
    </div>
  );
}

function ReflectionQuestion({
  idx,
  total,
  progress,
  prompt,
  placeholder,
  text,
  onChange,
  onContinue,
  onSkip,
  onBack,
}: {
  idx: number;
  total: number;
  progress: number;
  prompt: string;
  placeholder: string;
  text: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <ProgressHeader idx={idx} total={total} progress={progress} />

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm">
        <span className="inline-block text-[10px] font-bold bg-rose-500/10 text-rose-700 px-1.5 py-0.5 rounded mb-3">
          اختياري
        </span>
        <h2 className="font-display text-xl sm:text-2xl font-bold mb-5 leading-relaxed">
          {prompt}
        </h2>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          maxLength={600}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        />
        <div className="mt-1 text-[11px] text-gray-400 text-end">
          {text.length}/600
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5 sm:justify-end">
          <Button variant="outline" onClick={onSkip} className="w-full sm:w-auto">
            تخطّى
          </Button>
          <Button
            onClick={onContinue}
            disabled={text.trim().length === 0}
            className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700"
          >
            استمر
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <BackButton onBack={onBack} idx={idx} />
      </div>
    </div>
  );
}

function BackButton({ onBack, idx }: { onBack: () => void; idx: number }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-sm text-gray-500 hover:text-foreground inline-flex items-center gap-1"
    >
      <ArrowRight className="w-4 h-4" />
      {idx === 0 ? 'رجوع للبداية' : 'السؤال السابق'}
    </button>
  );
}

function Calculating() {
  return (
    <div className="text-center py-20">
      <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-6" />
      <h2 className="font-display text-2xl font-bold mb-2">بنحدد التيمات الأقوى في شغفك…</h2>
      <p className="text-sm text-gray-500">بنبني بروفايل شغفك من اللي شاركتنا</p>
    </div>
  );
}

function Gate({
  result,
  pending,
  err,
  onSubmit,
}: {
  result: SelfDiscoveryResult;
  pending: boolean;
  err: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const topTheme = result.top[0] ? getTheme(result.top[0]) : THEMES[0];
  return (
    <div>
      <div className={`rounded-2xl p-6 sm:p-8 mb-6 text-white bg-gradient-to-br ${topTheme.colorClass}`}>
        <div className="text-5xl mb-3">{topTheme.emoji}</div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
          أعلى تيمة في شغفك
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
          {topTheme.name_ar}
        </h2>
        <p className="text-sm opacity-90 leading-relaxed">{topTheme.tagline_ar}</p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8">
        <h3 className="font-display text-xl font-bold mb-2">✨ بروفايل شغفك جاهز</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          اكتب اسمك ورقم الواتساب نبعتلك بروفايلك الكامل + الخطوة العملية تبدأ
          بيها رحلتك دلوقتي.
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
            className="w-full bg-rose-600 hover:bg-rose-700"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحضير…
              </>
            ) : (
              <>
                شوف بروفايلك الكامل
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
  match,
  confirmed,
}: {
  result: SelfDiscoveryResult;
  match: SelfDiscoveryMatch;
  confirmed: boolean;
}) {
  const topTheme = result.top[0] ? getTheme(result.top[0]) : THEMES[0];
  const weak = isWeakProfile(result);
  const waMsg = `بروفايل شغفي طلع: ${result.top.map((t) => getTheme(t).name_ar).join(' + ')}. عاوز أعرف أكتر عن كورس ${match.primary?.title_ar ?? ''}`;
  const waHref = `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(waMsg)}`;
  const maxScore = Math.max(...Object.values(result.scores), 1);

  return (
    <div className="space-y-6">
      {confirmed && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          تم حفظ نتيجتك! هنبعتلك التفاصيل على واتساب.
        </div>
      )}

      {/* Top theme card */}
      <div className={`rounded-2xl p-6 sm:p-8 text-white bg-gradient-to-br ${topTheme.colorClass}`}>
        <div className="text-6xl mb-3">{topTheme.emoji}</div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
          بروفايل شغفك يبدأ بـ
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
          {topTheme.name_ar}
        </h1>
        <p className="text-sm opacity-90 leading-relaxed">{topTheme.description_ar}</p>
      </div>

      {/* Theme stack */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-1">تيماتك الـ {result.top.length} الأقوى</h3>
        <p className="text-xs text-gray-500 mb-4">
          الـ themes اللي طلعت أعلى في إجاباتك — قراءة لطبيعة شغفك من زوايا
          مختلفة.
        </p>
        <ul className="space-y-3">
          {result.top.map((id, i) => {
            const t = getTheme(id);
            const pct = (result.scores[id] / maxScore) * 100;
            return (
              <li key={id}>
                <div className="flex items-center justify-between text-sm mb-1.5 gap-3">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{t.emoji}</span>
                    <span className="font-bold truncate">{i + 1}. {t.name_ar}</span>
                  </span>
                  <span className="text-xs text-gray-500" dir="ltr">
                    {result.scores[id]} نقطة
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  {t.tagline_ar}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Primary recommendation — discover-your-passion */}
      {match.primary && (
        <div className="rounded-2xl bg-white border-2 border-rose-500/30 p-6 sm:p-8">
          {weak && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
              تيماتك قريبة من بعض — لسه شغفك مش محدد بقوة. الكورس ده هيوضّحلك صورة
              أعمق.
            </p>
          )}
          <p className="text-xs text-rose-700 font-medium mb-1">الكورس المخصّص لرحلتك</p>
          <h3 className="font-display text-2xl font-bold mb-2">{match.primary.title_ar}</h3>
          {match.primary.short_description_ar && (
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              {match.primary.short_description_ar}
            </p>
          )}
          <Button asChild size="lg" className="w-full bg-rose-600 hover:bg-rose-700">
            <Link href={`/course/${match.primary.slug}`}>
              <PlayCircle className="w-5 h-5" />
              ابدأ الكورس دلوقتي
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      )}

      {(match.alsoExplore.length > 0 || match.addOn) && (
        <div>
          <h3 className="font-display text-lg font-bold mb-3">كورسات هتستمتع بيها</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="rounded-2xl bg-gradient-to-br from-brand-500/10 to-emerald-500/10 border border-brand-500/30 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-1">عرفت اللي بيشدّك…</h3>
        <p className="text-sm text-gray-600 mb-3">
          دلوقتي نشوف تشتغل في إيه؟ خد التيست المهني — قراءة تحليلية لمسارك.
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
      className="group flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-rose-500/40 hover:bg-rose-500/5 transition-colors"
    >
      <div className="min-w-0">
        {badge && (
          <span className="inline-block text-[10px] font-bold bg-rose-500/10 text-rose-700 px-1.5 py-0.5 rounded mb-1">
            {badge}
          </span>
        )}
        <div className="font-medium text-sm truncate">{title}</div>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-rose-500 flex-shrink-0" />
    </Link>
  );
}

// THEMES is referenced in the gate fallback path.
void THEMES;
