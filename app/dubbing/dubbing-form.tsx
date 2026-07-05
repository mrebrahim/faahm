'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Video,
  Sparkles,
  Mail,
  User,
  Phone,
  Link as LinkIcon,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  DUBBING_USD_PER_MINUTE,
  DUBBING_MIN_MINUTES,
  DUBBING_MAX_MINUTES,
  dubbingTotalUsd,
  isEmailish,
  normaliseLinks,
} from '@/lib/dubbing';

/**
 * Self-service dubbing order form. All state is local; on submit we
 * POST to /api/dubbing/checkout which validates + persists + opens
 * a Stripe Checkout Session. The client mirrors the server's
 * (minutes × $2) calculation for the live total but never trusts
 * itself — the server re-computes before charging.
 */

const LANGUAGES = [
  'العربية',
  'الإنجليزية',
  'الفرنسية',
  'الإسبانية',
  'الألمانية',
  'التركية',
  'الأوردو',
  'الهندية',
  'الروسية',
  'الصينية',
  'الكورية',
  'اليابانية',
  'أخرى',
];

const DIALECTS = [
  'مصري',
  'خليجي',
  'سعودي',
  'شامي',
  'مغربي',
  'فصحى',
  'حسب الطلب',
];

export function DubbingForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [links, setLinks] = useState('');
  const [videoCount, setVideoCount] = useState(1);
  const [minutes, setMinutes] = useState(10);
  const [sourceLang, setSourceLang] = useState('العربية');
  const [targetLang, setTargetLang] = useState('الإنجليزية');
  const [dialect, setDialect] = useState('حسب الطلب');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clampedMinutes = Math.max(
    DUBBING_MIN_MINUTES,
    Math.min(DUBBING_MAX_MINUTES, Math.floor(minutes) || 0)
  );
  const total = useMemo(() => dubbingTotalUsd(clampedMinutes), [clampedMinutes]);

  const validLinks = useMemo(() => normaliseLinks(links).length > 0, [links]);
  const canSubmit =
    !submitting &&
    name.trim().length > 0 &&
    isEmailish(email) &&
    whatsapp.trim().length > 0 &&
    validLinks &&
    clampedMinutes >= DUBBING_MIN_MINUTES;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const resp = await fetch('/api/dubbing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          videoLinks: links,
          videoCount,
          minutes: clampedMinutes,
          sourceLang,
          targetLang,
          dialect,
        }),
      });
      const data = (await resp.json()) as {
        ok?: boolean;
        url?: string;
        error?: string;
        detail?: string;
      };
      if (!resp.ok || !data.ok || !data.url) {
        setError(data.detail || data.error || `فشل الطلب (${resp.status})`);
        setSubmitting(false);
        return;
      }
      window.location.assign(data.url);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Language pickers */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          اللغة واللهجة
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="من لغة">
            <Select value={sourceLang} onChange={setSourceLang} options={LANGUAGES} />
          </Field>
          <Field label="إلى لغة">
            <Select value={targetLang} onChange={setTargetLang} options={LANGUAGES} />
          </Field>
          <Field label="اللهجة">
            <Select value={dialect} onChange={setDialect} options={DIALECTS} />
          </Field>
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
          <User className="w-4 h-4 text-brand-600" />
          بياناتك
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="الاسم">
            <TextIn
              value={name}
              onChange={setName}
              placeholder="اسمك بالكامل"
              icon={<User className="w-4 h-4" />}
            />
          </Field>
          <Field label="الإيميل">
            <TextIn
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              dir="ltr"
              icon={<Mail className="w-4 h-4" />}
            />
          </Field>
          <Field label="رقم واتساب (مع كود الدولة)">
            <TextIn
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="+201xxxxxxxxx"
              dir="ltr"
              icon={<Phone className="w-4 h-4" />}
            />
          </Field>
          <Field label="عدد الفيديوهات">
            <TextIn
              value={String(videoCount)}
              onChange={(v) => {
                const n = Math.max(1, Math.min(100, parseInt(v, 10) || 1));
                setVideoCount(n);
              }}
              type="number"
              dir="ltr"
              icon={<Video className="w-4 h-4" />}
            />
          </Field>
        </div>
      </section>

      {/* Video links */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-3">
        <div>
          <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-brand-600" />
            لينكات الفيديوهات
          </h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            حط لينك في كل سطر (Google Drive / يوتيوب / تيك توك / إنستجرام / أي حاجة).
            <strong className="text-amber-700"> مهم:</strong> تأكد إن كل اللينكات
            مفتوحة للوصول (Anyone with the link).
          </p>
        </div>
        <textarea
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          rows={5}
          dir="ltr"
          placeholder={`https://drive.google.com/…\nhttps://youtu.be/…\nhttps://www.tiktok.com/@…`}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none font-mono"
        />
      </section>

      {/* Minutes + total */}
      <section className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/5 to-white p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display text-lg font-extrabold flex items-center gap-2">
            <Video className="w-4 h-4 text-brand-600" />
            إجمالي دقائق الفيديوهات
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={DUBBING_MIN_MINUTES}
              max={DUBBING_MAX_MINUTES}
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 0)}
              dir="ltr"
              className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-center font-bold tabular-nums focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            />
            <span className="text-xs text-gray-600">دقيقة</span>
          </div>
        </div>
        <input
          type="range"
          min={DUBBING_MIN_MINUTES}
          max={DUBBING_MAX_MINUTES}
          value={clampedMinutes}
          onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
          className="w-full accent-brand-500"
        />
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            {clampedMinutes} دقيقة × ${DUBBING_USD_PER_MINUTE}
          </div>
          <div className="text-end">
            <div className="text-xs text-gray-500 mb-0.5">الإجمالي</div>
            <div className="font-display text-3xl font-extrabold text-brand-700 tabular-nums" dir="ltr">
              ${total}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full inline-flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-base transition-colors shadow-lg shadow-brand-500/25"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري تحويلك للدفع…
          </>
        ) : (
          <>
            ابدأ الدبلجة — ادفع ${total}
            <ArrowLeft className="w-4 h-4" />
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        دفع آمن عبر Stripe · مفيش تجديد تلقائي
      </div>
    </form>
  );
}

/* ─────────────────── field primitives ─────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-gray-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function TextIn({
  value,
  onChange,
  placeholder,
  type = 'text',
  dir,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  dir?: 'ltr' | 'rtl';
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className={`w-full h-11 rounded-xl border border-gray-200 bg-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none ${icon ? 'ps-9 pe-3' : 'px-3'}`}
      />
    </div>
  );
}
