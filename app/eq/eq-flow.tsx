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
  HeartHandshake,
  Users2,
} from 'lucide-react';
import { EQ_QUESTIONS } from '@/lib/eq/questions';
import { tally } from '@/lib/eq/scoring';
import { getDomain, getBand, DOMAINS } from '@/lib/eq/domains';
import { matchCoursesForEq, type EqMatch } from '@/lib/eq/matching';
import type { CatalogCourse } from '@/lib/career/matching';
import {
  LIKERT_LABELS,
  type EqAnswer,
  type EqResult,
  type LikertAnswer,
} from '@/lib/eq/types';
import { submitEqLead } from './actions';
import { OFFLINE_PAYMENTS } from '@/lib/constants';

type Stage = 'intro' | 'quiz' | 'calculating' | 'gate' | 'result';

export function EqFlow({ catalog }: { catalog: CatalogCourse[] }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState<EqAnswer[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = EQ_QUESTIONS.length;
  const currentQ = EQ_QUESTIONS[qIdx];
  const progress = (answers.length / total) * 100;

  const preview = useMemo(() => {
    if (answers.length < total) return null;
    const result = tally(answers);
    const band = getBand(result.band);
    const match = matchCoursesForEq(catalog, result);
    return { result, band, match };
  }, [answers, catalog, total]);

  function choose(value: LikertAnswer) {
    const next: EqAnswer[] = [
      ...answers.filter((a) => a.questionId !== currentQ.id),
      { questionId: currentQ.id, value },
    ];
    setAnswers(next);
    if (qIdx + 1 < total) {
      setQIdx(qIdx + 1);
    } else {
      setStage('calculating');
      setTimeout(() => setStage('gate'), 1500);
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
      const res = await submitEqLead({ name, whatsapp, email, answers });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setConfirmed(true);
      setStage('result');
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-fuchsia-50">
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
            score={preview.result.overallScore}
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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-700 text-xs font-medium mb-5">
        <HeartHandshake className="w-3.5 h-3.5" />
        16 سؤال · 4 دقايق
      </span>
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
        ذكاءك
        <br />
        <span className="text-pink-600">العاطفي EQ</span>
      </h1>
      <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
        تيست خفيف يحدّد مستوى الـ EQ بتاعك في 4 أبعاد، ويقولك إيه نقطة قوتك
        الطبيعية وإيه أكتر بُعد فيه فرصة للنمو.
      </p>
      <Button
        size="lg"
        onClick={onStart}
        className="text-base px-8 py-6 bg-pink-600 hover:bg-pink-700"
      >
        <PlayCircle className="w-5 h-5" />
        ابدأ التيست
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <p className="text-[11px] text-gray-400 mt-6 max-w-md mx-auto leading-relaxed">
        النتيجة تأمّل ذاتي مش تشخيص طبي. الـ EQ مهارة بتتبني — مفيش رقم
        نهائي.
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
            className="h-full bg-pink-500 transition-all duration-300"
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
                  ? 'border-pink-500 bg-pink-500/5 text-pink-700 font-medium'
                  : 'border-gray-200 bg-white hover:border-pink-500/40 hover:bg-pink-500/5'
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
      <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto mb-6" />
      <h2 className="font-display text-2xl font-bold mb-2">
        بنحلل بروفايلك العاطفي…
      </h2>
      <p className="text-sm text-gray-500">بنحسب نتيجتك على المحاور الأربعة</p>
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
              EQ
            </p>
            <div className="font-display text-5xl font-extrabold leading-none">
              {score}
              <span className="text-2xl opacity-70">/100</span>
            </div>
          </div>
        </div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
          مستواك العام
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-2 leading-tight">
          {band.name_ar}
        </h2>
        <p className="text-sm opacity-90 leading-relaxed">{band.tagline_ar}</p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8">
        <h3 className="font-display text-xl font-bold mb-2">💞 بروفايلك العاطفي جاهز</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          اكتب اسمك ورقم الواتساب نبعتلك التحليل التفصيلي + الـ tactics اللي
          تبني بها كل بُعد.
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
            className="w-full bg-pink-600 hover:bg-pink-700"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحضير…
              </>
            ) : (
              <>
                شوف التحليل الكامل
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
  result: EqResult;
  band: ReturnType<typeof getBand>;
  match: EqMatch;
  confirmed: boolean;
}) {
  const strongest = getDomain(result.strongest);
  const weakest = getDomain(result.weakest);
  const waMsg = `الـ EQ بتاعي: ${result.overallScore}/100 — نقطة قوتي: ${strongest.name_ar}. عاوز أعرف أكتر`;
  const waHref = `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="space-y-6">
      {confirmed && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          تم حفظ نتيجتك! هنبعتلك التفاصيل على واتساب.
        </div>
      )}

      {/* Header card */}
      <div className={`rounded-2xl p-6 sm:p-8 text-white bg-gradient-to-br ${band.colorClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-6xl">{band.emoji}</div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider opacity-80 mb-0.5">
              EQ
            </p>
            <div className="font-display text-6xl font-extrabold leading-none">
              {result.overallScore}
              <span className="text-3xl opacity-70">/100</span>
            </div>
          </div>
        </div>
        <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
          مستواك العام
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold mb-2 leading-tight">
          {band.name_ar}
        </h1>
        <p className="text-sm opacity-90 leading-relaxed">{band.description_ar}</p>
      </div>

      {/* Domain breakdown */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-1">المحاور الأربعة</h3>
        <p className="text-xs text-gray-500 mb-4">
          الـ EQ موزّع على 4 محاور — كل واحد بيتطور بتمارين مختلفة.
        </p>
        <div className="space-y-3">
          {DOMAINS.map((d) => {
            const score = result.domains[d.id];
            const isStrong = d.id === result.strongest;
            const isWeak = d.id === result.weakest && result.strongest !== result.weakest;
            const color =
              score.pct >= 70
                ? 'bg-pink-500'
                : score.pct >= 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500';
            return (
              <div key={d.id}>
                <div className="flex items-center justify-between mb-1.5 gap-3">
                  <span className="text-sm font-medium flex items-center gap-2 truncate">
                    <span className="text-lg">{d.emoji}</span>
                    <span className="truncate">{d.name_ar}</span>
                    {isStrong && (
                      <span className="text-[9px] font-bold bg-pink-500 text-white px-1.5 py-0.5 rounded-full">
                        نقطة قوة
                      </span>
                    )}
                    {isWeak && (
                      <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                        فرصة نمو
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

      {/* Superpower */}
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5" />
          <p className="text-xs uppercase tracking-wider opacity-90 font-bold">
            نقطة قوتك الطبيعية
          </p>
        </div>
        <h3 className="font-display text-xl font-bold mb-2">
          {strongest.emoji} {strongest.name_ar}
        </h3>
        <p className="text-sm opacity-90 leading-relaxed">
          {strongest.strength_statement_ar}
        </p>
      </div>

      {/* Growth area */}
      {result.strongest !== result.weakest && (
        <div className="rounded-2xl bg-white border-2 border-amber-300 p-5 sm:p-6">
          <p className="text-xs text-amber-800 font-bold uppercase tracking-wider mb-1">
            أكبر فرصة نمو
          </p>
          <h3 className="font-display text-xl font-bold mb-2">
            {weakest.emoji} {weakest.name_ar}
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            {weakest.description_ar}
          </p>
          <ul className="space-y-2 text-sm">
            {weakest.growth_tips_ar.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Soft course recommendation */}
      {match.primary && (
        <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8">
          <p className="text-xs text-gray-500 mb-1">
            ⚠️ مفيش كورس EQ متخصص في فاهم لسه. الكورس ده مقترح soft بناءً على نقطة نموك.
          </p>
          <h3 className="font-display text-lg font-bold mt-3 mb-2">
            {match.primary.title_ar}
          </h3>
          {match.primary.short_description_ar && (
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {match.primary.short_description_ar}
            </p>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href={`/course/${match.primary.slug}`}>
              <PlayCircle className="w-4 h-4" />
              شوف الكورس
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      )}

      {(match.alsoExplore.length > 0 || match.addOn) && (
        <div>
          <h3 className="font-display text-lg font-bold mb-3">كورسات مكمّلة</h3>
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

      {/* Heavy cross-sell — this is the test's real funnel value */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold mb-1">عرفت ذكاءك العاطفي… وبعدين؟</h3>
        <p className="text-sm text-gray-500 mb-4">
          التيستات دي بتكمّل صورتك — كل واحد منهم بيقولك على مسار محدد:
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <CrossSell
            href="/personality"
            icon={Users2}
            title="اختبار الشخصية"
            sub="نمطك من 16 نمط"
            accent="indigo"
          />
          <CrossSell
            href="/career"
            icon={Sparkles}
            title="التيست المهني"
            sub="مجالك في الـ AI"
            accent="brand"
          />
          <CrossSell
            href="/self-discovery"
            icon={HeartHandshake}
            title="اكتشاف الذات"
            sub="تيمات شغفك"
            accent="rose"
          />
          <CrossSell
            href="/productivity"
            icon={Sparkles}
            title="ليه بتأجّل؟"
            sub="اللي بيوقّفك عن الإنجاز"
            accent="amber"
          />
        </div>
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
      className="group flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-pink-500/40 hover:bg-pink-500/5 transition-colors"
    >
      <div className="min-w-0">
        {badge && (
          <span className="inline-block text-[10px] font-bold bg-pink-500/10 text-pink-700 px-1.5 py-0.5 rounded mb-1">
            {badge}
          </span>
        )}
        <div className="font-medium text-sm truncate">{title}</div>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-pink-500 flex-shrink-0" />
    </Link>
  );
}

function CrossSell({
  href,
  icon: Icon,
  title,
  sub,
  accent,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  accent: 'indigo' | 'brand' | 'rose' | 'amber';
}) {
  const bg =
    accent === 'indigo'
      ? 'bg-indigo-500/10 text-indigo-600'
      : accent === 'brand'
        ? 'bg-brand-500/10 text-brand-600'
        : accent === 'rose'
          ? 'bg-rose-500/10 text-rose-600'
          : 'bg-amber-500/10 text-amber-600';
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
    >
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className="w-4.5 h-4.5" />
      </span>
      <div className="min-w-0">
        <div className="font-bold text-sm">{title}</div>
        <div className="text-[11px] text-gray-500 truncate">{sub}</div>
      </div>
    </Link>
  );
}
