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
  Sparkles,
  Loader2,
  MessageCircle,
  PlayCircle,
} from 'lucide-react';
import { QUESTIONS } from '@/lib/career/questions';
import { tally } from '@/lib/career/scoring';
import { matchArchetype } from '@/lib/career/archetypes';
import {
  matchCourses,
  type CatalogCourse,
  type MatchResult,
} from '@/lib/career/matching';
import type { Answer } from '@/lib/career/types';
import { submitCareerLead } from './actions';
import { OFFLINE_PAYMENTS } from '@/lib/constants';

type Stage = 'intro' | 'quiz' | 'calculating' | 'gate' | 'result';

export function CareerFlow({ catalog }: { catalog: CatalogCourse[] }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);

  const currentQ = QUESTIONS[questionIdx];
  const progress = (answers.length / QUESTIONS.length) * 100;

  // Live preview of the eventual result — used to render the gate
  // teaser (archetype name) and the post-submit result page without
  // a second roundtrip.
  const preview = useMemo(() => {
    if (answers.length < QUESTIONS.length) return null;
    const result = tally(answers);
    const archetype = matchArchetype(result);
    const match = matchCourses(catalog, result);
    return { result, archetype, match };
  }, [answers, catalog]);

  function chooseOption(optionIndex: number) {
    const next = [
      ...answers.filter((a) => a.questionId !== currentQ.id),
      { questionId: currentQ.id, optionIndex },
    ];
    setAnswers(next);
    if (questionIdx + 1 < QUESTIONS.length) {
      setQuestionIdx(questionIdx + 1);
    } else {
      setStage('calculating');
      // Tiny pause so the animation feels intentional, not janky.
      setTimeout(() => setStage('gate'), 1400);
    }
  }

  function goBack() {
    if (questionIdx === 0) return setStage('intro');
    setQuestionIdx(questionIdx - 1);
  }

  function onLeadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitErr(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '');
    const whatsapp = String(fd.get('whatsapp') || '');
    const email = String(fd.get('email') || '') || null;

    startTransition(async () => {
      const res = await submitCareerLead({
        name,
        whatsapp,
        email,
        answers,
      });
      if (!res.ok) {
        setSubmitErr(res.error);
        return;
      }
      setConfirmed(true);
      setStage('result');
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-500/5">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
        {stage === 'intro' && <Intro onStart={() => setStage('quiz')} />}

        {stage === 'quiz' && currentQ && (
          <Quiz
            qIdx={questionIdx}
            total={QUESTIONS.length}
            progress={progress}
            prompt={currentQ.prompt}
            options={currentQ.options.map((o) => o.label)}
            selected={
              answers.find((a) => a.questionId === currentQ.id)?.optionIndex ?? null
            }
            onChoose={chooseOption}
            onBack={goBack}
          />
        )}

        {stage === 'calculating' && <Calculating />}

        {stage === 'gate' && preview && (
          <Gate
            archetypeName={preview.archetype.name_ar}
            archetypeEmoji={preview.archetype.emoji}
            tagline={preview.archetype.tagline_ar}
            colorClass={preview.archetype.colorClass}
            pending={pending}
            err={submitErr}
            onSubmit={onLeadSubmit}
          />
        )}

        {stage === 'result' && preview && (
          <Result
            archetype={preview.archetype}
            match={preview.match}
            confirmed={confirmed}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   STAGES
   ============================================================================ */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-700 text-xs font-medium mb-5">
        <Sparkles className="w-3.5 h-3.5" />
        تيست ذكي مبني على معايير Holland Codes العالمية
      </span>
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
        اكتشف شغفك الحقيقي
        <br />
        في <span className="text-brand-600">3 دقايق</span>
      </h1>
      <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
        15 سؤال بسيط، إجابات بصراحة، وهتعرف نوع شخصيتك المهنية، إيه اللي يناسبك،
        والخطوة الأولى تبدأ منين.
      </p>
      <Button size="lg" onClick={onStart} className="text-base px-8 py-6">
        <PlayCircle className="w-5 h-5" />
        ابدأ التيست
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <p className="text-xs text-gray-400 mt-6">
        مجاناً · بدون تسجيل · نتيجتك في 3 دقايق
      </p>
    </div>
  );
}

function Quiz({
  qIdx,
  total,
  progress,
  prompt,
  options,
  selected,
  onChoose,
  onBack,
}: {
  qIdx: number;
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
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>سؤال {qIdx + 1} من {total}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

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
                  ? 'border-brand-500 bg-brand-500/5 text-brand-700 font-medium'
                  : 'border-gray-200 bg-white hover:border-brand-500/40 hover:bg-brand-500/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowRight className="w-4 h-4" />
          {qIdx === 0 ? 'رجوع للبداية' : 'السؤال السابق'}
        </button>
      </div>
    </div>
  );
}

function Calculating() {
  return (
    <div className="text-center py-20">
      <div className="inline-block mb-6">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">بنحلل إجاباتك…</h2>
      <p className="text-sm text-gray-500">
        بنبني بروفايلك المهني بناءً على إجاباتك
      </p>
    </div>
  );
}

function Gate({
  archetypeName,
  archetypeEmoji,
  tagline,
  colorClass,
  pending,
  err,
  onSubmit,
}: {
  archetypeName: string;
  archetypeEmoji: string;
  tagline: string;
  colorClass: string;
  pending: boolean;
  err: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div>
      {/* Teaser card */}
      <div
        className={`rounded-2xl p-6 sm:p-8 mb-6 text-white bg-gradient-to-br ${colorClass}`}
      >
        <div className="text-5xl mb-3">{archetypeEmoji}</div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
          أنت من نوع
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
          {archetypeName}
        </h2>
        <p className="text-sm opacity-90 leading-relaxed">{tagline}</p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8">
        <h3 className="font-display text-xl font-bold mb-2">
          🎉 نتيجتك جاهزة!
        </h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          اكتب اسمك ورقم الواتساب، نبعتلك التقرير الكامل + الخطوة العملية
          الأولى اللي تبدأ بيها.
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

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحضير…
              </>
            ) : (
              <>
                شوف التقرير الكامل
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </Button>
          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            بيانات الاتصال هتُستخدم لإرسال التقرير وتوصيات الكورسات فقط.
          </p>
        </form>
      </div>
    </div>
  );
}

function Result({
  archetype,
  match,
  confirmed,
}: {
  archetype: ReturnType<typeof matchArchetype>;
  match: MatchResult;
  confirmed: boolean;
}) {
  const waMsg = `أنا نوع شخصيتي المهنية: ${archetype.name_ar} ${archetype.emoji}. عاوز أعرف أكتر عن كورس ${match.primary?.title_ar ?? ''}`;
  const waHref = `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="space-y-6">
      {confirmed && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          تم حفظ نتيجتك! هنبعتلك التفاصيل على واتساب.
        </div>
      )}

      {/* Archetype card */}
      <div
        className={`rounded-2xl p-6 sm:p-8 text-white bg-gradient-to-br ${archetype.colorClass}`}
      >
        <div className="text-6xl mb-3">{archetype.emoji}</div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
          نوع شخصيتك المهنية
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
          {archetype.name_ar}
        </h1>
        <p className="text-sm opacity-90 leading-relaxed">
          {archetype.tagline_ar}
        </p>
      </div>

      {/* Report sections */}
      <Section title="أنت في سطرين">
        {archetype.report.you_in_a_nutshell}
      </Section>

      <Section title="ليه ده يناسبك">
        {archetype.report.why_this_fits}
      </Section>

      <Section title="مجالات مناسبة ليك">
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {archetype.report.careers.map((c) => (
            <li key={c} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
              {c}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="الخطوة الأولى">
        {archetype.report.first_step}
      </Section>

      {/* Course CTAs */}
      {match.primary && (
        <div className="rounded-2xl bg-white border-2 border-brand-500/30 p-6 sm:p-8">
          {match.undecided && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
              لسه مجالك مش واضح ١٠٠٪، ابدأ بكورس اكتشاف الشغف ومنه نبني.
            </p>
          )}
          <p className="text-xs text-brand-700 font-medium mb-1">
            الكورس الموصى به ليك
          </p>
          <h3 className="font-display text-2xl font-bold mb-2">
            {match.primary.title_ar}
          </h3>
          {match.primary.short_description_ar && (
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              {match.primary.short_description_ar}
            </p>
          )}
          <Button asChild size="lg" className="w-full">
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
          <h3 className="font-display text-lg font-bold mb-3">
            ممكن كمان يعجبك
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {match.alsoExplore.map((c) => (
              <CourseChip key={c.id} slug={c.slug} title={c.title_ar} />
            ))}
            {match.addOn && (
              <CourseChip
                key={match.addOn.id}
                slug={match.addOn.slug}
                title={match.addOn.title_ar}
                badge="إضافة قيّمة"
              />
            )}
          </div>
        </div>
      )}

      {/* WhatsApp follow-up */}
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

/* ============================================================================
   BITS
   ============================================================================ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
      <h3 className="font-display text-lg font-bold mb-2">{title}</h3>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
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
      className="group flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-brand-500/40 hover:bg-brand-500/5 transition-colors"
    >
      <div className="min-w-0">
        {badge && (
          <span className="inline-block text-[10px] font-bold bg-brand-500/10 text-brand-700 px-1.5 py-0.5 rounded mb-1">
            {badge}
          </span>
        )}
        <div className="font-medium text-sm truncate">{title}</div>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-brand-500 flex-shrink-0" />
    </Link>
  );
}
