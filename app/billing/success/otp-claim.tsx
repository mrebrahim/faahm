'use client';

import { useState } from 'react';
import { sendOtp, verifyOtp } from '@/app/login/actions';
import { ROUTES } from '@/lib/constants';
import { Mail, KeyRound, ArrowLeft, PlayCircle } from 'lucide-react';

/**
 * Inline email-OTP form on /billing/success. Replaces the previous
 * password-setting ClaimAccountForm so a guest who just paid can
 * sign in with a 6-digit code emailed to them — no password to
 * remember, one fewer field, fewer drop-offs.
 *
 * Two steps:
 *   1. Reveal: a single "ابدأ الكورسات الآن" CTA. Click → step 2.
 *   2. Email + code: prefilled with the email the visitor paid with
 *      (from the Stripe session / guest cookie). They get the code
 *      by email, type it in, and the form posts to verifyOtp which
 *      sets the session cookie and redirects them to /courses.
 *
 * On the server side, verifyOtp matches by email and either:
 *   - logs them into the existing Supabase user (the one
 *     reconcileCheckoutSession / ensureUserForEmail already
 *     provisioned for the payment), OR
 *   - creates one on the fly if for some reason it wasn't there
 *     (Supabase signInWithOtp shouldCreateUser=true on the send
 *     side already handles that).
 *
 * Either way, the Stripe webhook has already linked the subscription
 * row to that user id, so the moment the session cookie lands and
 * the visitor hits /courses, every course unlocks.
 */
export function OtpClaim({ email }: { email: string }) {
  const [step, setStep] = useState<'cta' | 'email' | 'code'>('cta');
  const [sentEmail, setSentEmail] = useState(email);

  if (step === 'cta') {
    return (
      <button
        type="button"
        onClick={() => setStep('email')}
        className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base transition-colors"
      >
        <PlayCircle className="w-5 h-5" />
        ابدأ الكورسات الآن
        <ArrowLeft className="w-4 h-4" />
      </button>
    );
  }

  if (step === 'email') {
    return (
      <form
        action={async (formData) => {
          const e = String(formData.get('email') || '').trim().toLowerCase();
          setSentEmail(e);
          // Optimistic transition — sendOtp ends with a redirect on
          // success/failure, so this state lets us paint the code-
          // entry UI immediately while the action fires.
          setStep('code');
          await sendOtp(formData);
        }}
        className="rounded-2xl border border-brand-500/40 bg-white p-5 sm:p-6 text-start space-y-4"
      >
        <input type="hidden" name="from" value="login" />
        <input type="hidden" name="redirect" value={ROUTES.courses} />
        <div>
          <label
            htmlFor="otp-email"
            className="block text-sm font-bold text-foreground mb-1.5"
          >
            إيميلك اللي دفعت بيه
          </label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="otp-email"
              type="email"
              name="email"
              defaultValue={email}
              required
              dir="ltr"
              className="w-full rounded-xl border border-gray-200 bg-white ps-10 pe-4 py-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
              placeholder="you@example.com"
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
            هنبعتلك كود تأكيد على إيميلك دلوقتي. مفيش كلمة سر، ادخل بالكود وخلاص.
          </p>
        </div>
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors"
        >
          <Mail className="w-4 h-4" />
          ابعت لي الكود
        </button>
      </form>
    );
  }

  // Step: code entry
  return (
    <form
      action={verifyOtp}
      className="rounded-2xl border border-brand-500/40 bg-white p-5 sm:p-6 text-start space-y-4"
    >
      <input type="hidden" name="email" value={sentEmail} />
      <input type="hidden" name="from" value="login" />
      <input type="hidden" name="redirect" value={ROUTES.courses} />

      <div>
        <div className="text-sm font-bold text-foreground mb-1">
          اكتب الكود اللي جالك
        </div>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          بعتنالك كود مكوّن من 6 أرقام على{' '}
          <span dir="ltr" className="font-medium text-foreground">
            {sentEmail}
          </span>
          . لو ما لقيتوش، اتأكد من السبام.
        </p>
        <div className="relative">
          <KeyRound className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            name="token"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            dir="ltr"
            className="w-full rounded-xl border border-gray-200 bg-white ps-10 pe-4 py-3 text-lg tracking-[0.4em] text-center font-bold focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
            placeholder="123456"
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors"
      >
        <PlayCircle className="w-4 h-4" />
        ادخل وافتح الكورسات
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setStep('email')}
        className="block w-full text-center text-xs text-gray-500 hover:text-gray-700 underline"
      >
        غيّر الإيميل
      </button>
    </form>
  );
}
