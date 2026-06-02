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
} from 'lucide-react';
import { PERSONALITY_QUESTIONS, LIKERT_LABELS } from '@/lib/personality/questions';
import { tally } from '@/lib/personality/scoring';
import { getTypeOrFallback } from '@/lib/personality/personality-types';
import {
  matchCoursesForPersonality,
  type PersonalityMatch,
} from '@/lib/personality/matching';
import type {
  CatalogCourse,
} from '@/lib/career/matching';
import type { LikertAnswer, PersonalityAnswer } from '@/lib/personality/types';
import { submitPersonalityLead } from './actions';
import { OFFLINE_PAYMENTS } from '@/lib/constants';

type Stage = 'intro' | 'quiz' | 'calculating' | 'gate' | 'result';

export function PersonalityFlow({ catalog }: { catalog: CatalogCourse[] }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState<PersonalityAnswer[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = PERSONALITY_QUESTIONS.length;
  const currentQ = PERSONALITY_QUESTIONS[qIdx];
  const progress = (answers.length / total) * 100;

  const preview = useMemo(() => {
    if (answers.length < total) return null;
    const result = tally(answers);
    const type = getTypeOrFallback(result.code);
    const match = matchCoursesForPersonality(catalog, result);
    return { result, type, match };
  }, [answers, catalog, total]);

  function choose(value: LikertAnswer) {
    const next: PersonalityAnswer[] = [
      ...answers.filter((a) => a.questionId !== currentQ.id),
      { questionId: currentQ.id, value },
    ];
    setAnswers(next);
    if (qIdx + 1 < total) {
      setQIdx(qIdx + 1);
    } else {
      setStage('calculating');
      setTimeout(() => setStage('gate'), 1400);
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
      const res = await submitPersonalityLead({ name, whatsapp, email, answers });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setConfirmed(true);
      setStage('result');
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-500/5">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
        {stage === 'intro' && <Intro onStart={() => setStage('quiz')} />}

        {stage === 'quiz' && currentQ && (
          <Quiz
            idx={qIdx}
            total={total}
            progress={progress}
            statement={currentQ.text}
            selected={answers.find((a) => a.questionId === currentQ.id)?.value ?? null}
            onChoose={choose}
            onBack={back}
          />
        )}

        {stage === 'calculating' && <Calculating />}

        {stage === 'gate' && preview && (
          <Gate
            type={preview.type}
            pending={pending}
            err={err}
            onSubmit={onLeadSubmit}
          />
        )}

        {stage === 'result' && preview && (
          <Result
            type={preview.type}
            match={preview.match}
            confirmed={confirmed}
            scores={preview.result.scores}
            confidences={preview.result.confidences}
          />
        )}
      </div>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 text-xs font-medium mb-5">
        <Sparkles className="w-3.5 h-3.5" />
        16 شخصية · أنماط فاهم
      </span>
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
        اكتشف نمط شخصيتك
        <br />
        في <span className="text-indigo-600">5 دقايق</span>
      </h1>
      <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
        32 جملة بتجاوبهم بصراحة، وهتعرف نمط شخصيتك من 16 نمط، نقط قوتك، وإيه
        اللي يناسبك تتعلمه.
      </p>
      <Button size="lg" onClick={onStart} className="text-base px-8 py-6 bg-indigo-600 hover:bg-indigo-700">
        <PlayCircle className="w-5 h-5" />
        ابدأ الاختبار
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
  statement,
  selected,
  onChoose,
  onBack,
}: {
  idx: number;
  total: number;
  progress: number;
  statement: string;
  selected: LikertAnswer | null;
  onChoose: (v: LikertAnswer) => void;
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
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm">
        <p className="text-xs text-gray-500 mb-2">إلى أي مدى توافق على:</p>
        <h2 className="font-display text-xl sm:text-2xl font-bold mb-6 leading-relaxed">
          {statement}
        </h2>
        <div className="space-y-2">
          {LIKERT_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChoose(i as LikertAnswer)}
              className={`w-full text-right p-4 rounded-xl border-2 transition-all text-sm sm:text-base ${
                selected === i
                  ? 'border-indigo-500 bg-indigo-500/5 text-indigo-700 font-medium'
                  : 'border-gray-200 bg-white hover:border-indigo-500/40 hover:bg-indigo-500/5'
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
          {idx === 0 ? 'رجوع للبداية' : 'السؤال السابق'}
        </button>
      </div>
    </div>
  );
}

function Calculating() {
  return (
    <div className="text-center py-20">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-6" />
      <h2 className="font-display text-2xl font-bold mb-2">بنحدد نمط شخصيتك…</h2>
      <p className="text-sm text-gray-500">بنحسب نتيجتك على المحاور الأربعة</p>
    </div>
  );
}

function Gate({
  type,
  pending,
  err,
  onSubmit,
}: {
  type: ReturnType<typeof getTypeOrFallback>;
  pending: boolean;
  err: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div>
      <div className={`rounded-2xl p-6 sm:p-8 mb-6 text-white bg-gradient-to-br ${type.colorClass}`}>
        <div className="text-5xl mb-3">{type.emoji}</div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
          نمط شخصيتك
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-1">
          {type.name_ar}
        </h2>
        <p className="text-xs opacity-80 font-mono" dir="ltr">{type.code}</p>
        <p className="text-sm opacity-90 leading-relaxed mt-3">{type.tagline_ar}</p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8">
        <h3 className="font-display text-xl font-bold mb-2">🎉 نتيجتك جاهزة!</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          اكتب اسمك ورقم الواتساب، نبعتلك التقرير الكامل والكورسات اللي تناسبك.
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
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            disabled={pending}
          >
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
        </form>
      </div>
    </div>
  );
}

function Result({
  type,
  match,
  confirmed,
  scores,
  confidences,
}: {
  type: ReturnType<typeof getTypeOrFallback>;
  match: PersonalityMatch;
  confirmed: boolean;
  scores: Record<'EI' | 'SN' | 'TF' | 'JP', number>;
  confidences: Record<'EI' | 'SN' | 'TF' | 'JP', number>;
}) {
  const waMsg = `نمط شخصيتي: ${type.name_ar} (${type.code}) ${type.emoji}. عاوز أعرف أكتر عن كورس ${match.primary?.title_ar ?? ''}`;
  const waHref = `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="space-y-6">
      {confirmed && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          تم حفظ نتيجتك! هنبعتلك التفاصيل على واتساب.
        </div>
      )}

      <div className={`rounded-2xl p-6 sm:p-8 text-white bg-gradient-to-br ${type.colorClass}`}>
        <div className="text-6xl mb-3">{type.emoji}</div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">نمط شخصيتك</p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-1">
          {type.name_ar}
        </h1>
        <p className="text-sm opacity-80 font-mono mb-3" dir="ltr">{type.code}</p>
        <p className="text-sm opacity-90 leading-relaxed">{type.tagline_ar}</p>
      </div>

      {/* Axis breakdown */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-4">المحاور الأربعة</h3>
        <div className="space-y-4">
          <AxisBar label="الطاقة" left="منفتح (E)" right="متأمّل (I)" leftCode="E" rightCode="I" score={scores.EI} confidence={confidences.EI} />
          <AxisBar label="المعلومات" left="واقعي (S)" right="حدسي (N)" leftCode="S" rightCode="N" score={scores.SN} confidence={confidences.SN} />
          <AxisBar label="القرارات" left="منطقي (T)" right="وجداني (F)" leftCode="T" rightCode="F" score={scores.TF} confidence={confidences.TF} />
          <AxisBar label="الهيكل" left="منظِّم (J)" right="مرن (P)" leftCode="J" rightCode="P" score={scores.JP} confidence={confidences.JP} />
        </div>
      </div>

      <Section title="جوهرك">{type.report.essence}</Section>

      <Section title="نقاط قوتك">
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {type.report.strengths.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="انتبه لـ (نقاطك العمياء)">
        <ul className="space-y-1 text-sm">
          {type.report.blind_spots.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              {b}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="بتطلّع أحسن نتيجة لما">{type.report.works_best}</Section>

      {match.primary && (
        <div className="rounded-2xl bg-white border-2 border-indigo-500/30 p-6 sm:p-8">
          {match.lowConfidence && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
              نتيجتك على المحاور قريبة من بعض — نمطك مش محدد بقوة. ابدأ بكورس
              اكتشاف الشغف عشان توضّح اتجاهك.
            </p>
          )}
          <p className="text-xs text-indigo-700 font-medium mb-1">كورس ممكن تستمتع بيه</p>
          <h3 className="font-display text-2xl font-bold mb-2">{match.primary.title_ar}</h3>
          {match.primary.short_description_ar && (
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              {match.primary.short_description_ar}
            </p>
          )}
          <Button asChild size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700">
            <Link href={`/course/${match.primary.slug}`}>
              <PlayCircle className="w-5 h-5" />
              ابدأ الكورس
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      )}

      {(match.alsoExplore.length > 0 || match.addOn) && (
        <div>
          <h3 className="font-display text-lg font-bold mb-3">كمان ممكن تحب</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {match.alsoExplore.map((c) => (
              <CourseChip key={c.id} slug={c.slug} title={c.title_ar} />
            ))}
            {match.addOn && (
              <CourseChip
                slug={match.addOn.slug}
                title={match.addOn.title_ar}
                badge="إضافة قيّمة"
              />
            )}
          </div>
        </div>
      )}

      {/* Cross-sell to career test */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-500/10 to-emerald-500/10 border border-brand-500/30 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-1">عرفت إنت مين…</h3>
        <p className="text-sm text-gray-600 mb-3">
          تعرف تشتغل في إيه؟ خد التيست المهني — هيرشّحلك المسار اللي يكسّر فيه شخصيتك.
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

function AxisBar({
  label,
  left,
  right,
  leftCode,
  rightCode,
  score,
  confidence,
}: {
  label: string;
  left: string;
  right: string;
  leftCode: string;
  rightCode: string;
  score: number;
  confidence: number;
}) {
  // score in roughly −16..+16; map to 0..100 with 50 = center.
  const pct = Math.max(0, Math.min(100, 50 + (score / 16) * 50));
  const dominant = score >= 0 ? leftCode : rightCode;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium">{label}</span>
        <span className="text-gray-400">{(confidence * 100).toFixed(0)}% ثقة</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs whitespace-nowrap ${dominant === leftCode ? 'font-bold text-indigo-700' : 'text-gray-400'}`}>
          {left}
        </span>
        <div className="flex-1 h-2 rounded-full bg-gray-100 relative overflow-hidden">
          <div
            className="h-full bg-indigo-500"
            style={{
              width: `${Math.abs(pct - 50)}%`,
              marginLeft: score >= 0 ? 0 : `${pct}%`,
              marginRight: score < 0 ? 0 : `${100 - pct}%`,
            }}
          />
        </div>
        <span className={`text-xs whitespace-nowrap ${dominant === rightCode ? 'font-bold text-indigo-700' : 'text-gray-400'}`}>
          {right}
        </span>
      </div>
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
      className="group flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors"
    >
      <div className="min-w-0">
        {badge && (
          <span className="inline-block text-[10px] font-bold bg-indigo-500/10 text-indigo-700 px-1.5 py-0.5 rounded mb-1">
            {badge}
          </span>
        )}
        <div className="font-medium text-sm truncate">{title}</div>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 flex-shrink-0" />
    </Link>
  );
}
