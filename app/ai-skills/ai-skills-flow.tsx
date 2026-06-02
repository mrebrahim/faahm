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
  Sparkles,
  ListChecks,
} from 'lucide-react';
import {
  AI_SKILLS_QUESTIONS,
} from '@/lib/ai-skills/questions';
import { tally } from '@/lib/ai-skills/scoring';
import { LEVELS, getLevel, getLevelByNumber } from '@/lib/ai-skills/levels';
import {
  matchCoursesForSkills,
  type AISkillsMatch,
} from '@/lib/ai-skills/matching';
import type { CatalogCourse } from '@/lib/career/matching';
import {
  SKILL_OPTION_LABELS,
  type AISkillsAnswer,
  type AISkillsResult,
  type SkillAnswerValue,
} from '@/lib/ai-skills/types';
import { submitAISkillsLead } from './actions';
import { OFFLINE_PAYMENTS } from '@/lib/constants';

type Stage = 'intro' | 'quiz' | 'calculating' | 'gate' | 'result';

export function AISkillsFlow({ catalog }: { catalog: CatalogCourse[] }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState<AISkillsAnswer[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = AI_SKILLS_QUESTIONS.length;
  const currentQ = AI_SKILLS_QUESTIONS[qIdx];
  const progress = (answers.length / total) * 100;

  const preview = useMemo(() => {
    if (answers.length < total) return null;
    const result = tally(answers);
    const match = matchCoursesForSkills(catalog, result);
    return { result, match };
  }, [answers, catalog, total]);

  function choose(value: SkillAnswerValue) {
    const next: AISkillsAnswer[] = [
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
      const res = await submitAISkillsLead({ name, whatsapp, email, answers });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setConfirmed(true);
      setStage('result');
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-500/5">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
        {stage === 'intro' && <Intro onStart={() => setStage('quiz')} />}

        {stage === 'quiz' && currentQ && (
          <Quiz
            idx={qIdx}
            total={total}
            progress={progress}
            prompt={currentQ.prompt}
            options={currentQ.options ?? SKILL_OPTION_LABELS}
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
            result={preview.result}
            pending={pending}
            err={err}
            onSubmit={onLeadSubmit}
          />
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
    <div>
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-700 text-xs font-medium mb-5">
          <ListChecks className="w-3.5 h-3.5" />
          15 سؤال · 4 مستويات
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
          إنت فين على
          <br />
          <span className="text-violet-600">سلّم الـ AI؟</span>
        </h1>
        <p className="text-gray-600 text-lg mb-6 max-w-xl mx-auto leading-relaxed">
          تيست تشخيصي يحدد مستواك الفعلي في الـ AI من 1 لـ 4، ويقولك بالظبط
          الكورس اللي تبدأ بيه عشان تطلع للمستوى اللي بعده.
        </p>
      </div>

      {/* Show the ladder */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 mb-8">
        <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">
          السلّم اللي هتتقاس عليه
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LEVELS.map((l) => (
            <div
              key={l.id}
              className="rounded-xl border border-gray-200 bg-white p-3 text-center"
            >
              <div className="text-2xl mb-1">{l.emoji}</div>
              <div className="text-[10px] uppercase font-bold text-gray-400" dir="ltr">
                Level {l.number}
              </div>
              <div className="text-xs font-bold text-foreground mt-0.5">{l.name_ar}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Button
          size="lg"
          onClick={onStart}
          className="text-base px-8 py-6 bg-violet-600 hover:bg-violet-700"
        >
          <PlayCircle className="w-5 h-5" />
          ابدأ التشخيص
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <p className="text-xs text-gray-400 mt-6">
          مجاناً · بدون تسجيل · نتيجة فورية
        </p>
      </div>
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
  options: readonly string[];
  selected: SkillAnswerValue | null;
  onChoose: (v: SkillAnswerValue) => void;
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
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm">
        <h2 className="font-display text-xl sm:text-2xl font-bold mb-6 leading-relaxed">
          {prompt}
        </h2>
        <div className="space-y-2">
          {options.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChoose(i as SkillAnswerValue)}
              className={`w-full text-right p-4 rounded-xl border-2 transition-all text-sm sm:text-base leading-relaxed ${
                selected === i
                  ? 'border-violet-500 bg-violet-500/5 text-violet-700 font-medium'
                  : 'border-gray-200 bg-white hover:border-violet-500/40 hover:bg-violet-500/5'
              }`}
            >
              {label}
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
      <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-6" />
      <h2 className="font-display text-2xl font-bold mb-2">
        بنحدد مستواك على السلّم…
      </h2>
      <p className="text-sm text-gray-500">
        بنتأكد إيه اللي عملته فعلاً وإيه اللي لسه قدامك
      </p>
    </div>
  );
}

function Gate({
  result,
  pending,
  err,
  onSubmit,
}: {
  result: AISkillsResult;
  pending: boolean;
  err: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const level = getLevel(result.levelId);
  return (
    <div>
      <div className={`rounded-2xl p-6 sm:p-8 mb-6 text-white bg-gradient-to-br ${level.colorClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-5xl">{level.emoji}</div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider opacity-80 mb-0.5" dir="ltr">
              Level
            </p>
            <div className="font-display text-6xl font-extrabold leading-none">
              {result.level}
              <span className="text-2xl opacity-70">/4</span>
            </div>
          </div>
        </div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">مستواك</p>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
          {level.name_ar}
        </h2>
        <p className="text-sm opacity-90 leading-relaxed">{level.tagline_ar}</p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8">
        <h3 className="font-display text-xl font-bold mb-2">🎯 تقريرك جاهز</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          اكتب اسمك ورقم الواتساب نبعتلك خريطة المسار التعليمي المخصصة ليك
          والكورس اللي تبدأ بيه دلوقتي.
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
            className="w-full bg-violet-600 hover:bg-violet-700"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحضير…
              </>
            ) : (
              <>
                شوف مسارك التعليمي
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
  result: AISkillsResult;
  match: AISkillsMatch;
  confirmed: boolean;
}) {
  const level = getLevel(result.levelId);
  const gap = result.firstGapLevel ? getLevelByNumber(result.firstGapLevel) : null;
  const waMsg = `مستواي في الـ AI: Level ${result.level} — ${level.name_ar}. عاوز أعرف أكتر عن كورس ${match.primary?.title_ar ?? ''}`;
  const waHref = `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="space-y-6">
      {confirmed && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          تم حفظ نتيجتك! هنبعتلك التفاصيل على واتساب.
        </div>
      )}

      {/* Big level card */}
      <div className={`rounded-2xl p-6 sm:p-8 text-white bg-gradient-to-br ${level.colorClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-6xl">{level.emoji}</div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider opacity-80 mb-0.5" dir="ltr">
              Level
            </p>
            <div className="font-display text-7xl font-extrabold leading-none">
              {result.level}
              <span className="text-3xl opacity-70">/4</span>
            </div>
          </div>
        </div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">مستواك</p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
          {level.name_ar}
        </h1>
        <p className="text-sm opacity-90 leading-relaxed">{level.description_ar}</p>
      </div>

      {/* Ladder visualisation */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-1">السلّم الكامل</h3>
        <p className="text-xs text-gray-500 mb-4">
          مكانك دلوقتي + الخطوات الجاية على الطريق.
        </p>
        <div className="space-y-2">
          {LEVELS.map((l) => {
            const cleared = result.level >= l.number;
            const isCurrent = result.levelId === l.id;
            const isGap = result.firstGapLevel === l.number;
            return (
              <div
                key={l.id}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${
                  isCurrent
                    ? 'border-violet-500 bg-violet-500/5'
                    : isGap
                      ? 'border-amber-500/40 bg-amber-50'
                      : cleared
                        ? 'border-emerald-500/30 bg-emerald-50'
                        : 'border-gray-200 bg-white'
                }`}
              >
                <div className="text-2xl flex-shrink-0">{l.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-gray-400" dir="ltr">
                      Level {l.number}
                    </span>
                    <span className="font-bold text-sm">{l.name_ar}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full">
                        مكانك دلوقتي
                      </span>
                    )}
                    {isGap && (
                      <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                        الخطوة الجاية
                      </span>
                    )}
                    {cleared && !isCurrent && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{l.tagline_ar}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Can do now */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-3">دلوقتي بتقدر</h3>
        <ul className="space-y-2 text-sm">
          {level.can_do_ar.map((s) => (
            <li key={s} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Primary course CTA */}
      {match.primary && (
        <div className="rounded-2xl bg-white border-2 border-violet-500/30 p-6 sm:p-8">
          <p className="text-xs text-violet-700 font-medium mb-1">
            {gap ? `الخطوة الجاية → Level ${gap.number}` : 'كمل التخصص'}
          </p>
          <h3 className="font-display text-xl font-bold mb-2">{level.next_step_ar}</h3>
          <div className="mt-4 rounded-xl bg-violet-500/5 border border-violet-500/20 p-4">
            <p className="text-xs text-violet-700 font-medium mb-2">ابدأ بـ:</p>
            <h4 className="font-display text-lg font-bold mb-1">
              {match.primary.title_ar}
            </h4>
            {match.primary.short_description_ar && (
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {match.primary.short_description_ar}
              </p>
            )}
            <Button asChild size="lg" className="w-full bg-violet-600 hover:bg-violet-700">
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
                badge="أساس قوي"
              />
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-sky-500/10 border border-cyan-500/30 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-1">عرفت مستواك التقني…</h3>
        <p className="text-sm text-gray-600 mb-3">
          تعرف وضعك من ناحية تأثير الـ AI على شغلك؟ خد تيست الجاهزية.
        </p>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/ai-readiness">
            <Sparkles className="w-4 h-4" />
            خد تيست الجاهزية
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
      className="group flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
    >
      <div className="min-w-0">
        {badge && (
          <span className="inline-block text-[10px] font-bold bg-violet-500/10 text-violet-700 px-1.5 py-0.5 rounded mb-1">
            {badge}
          </span>
        )}
        <div className="font-medium text-sm truncate">{title}</div>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-violet-500 flex-shrink-0" />
    </Link>
  );
}
