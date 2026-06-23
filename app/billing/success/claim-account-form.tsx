'use client';

import { useState, useTransition } from 'react';
import { Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { claimAccount, claimGuestAccountByCookie } from './actions';

/**
 * Post-payment account claim form shown to guest checkout users on
 * /billing/success. Their Supabase user has already been provisioned
 * server-side (from the Stripe session's email for the card path, or
 * from the guest_checkout_email cookie for PayPal / offline). All
 * they're doing here is picking the password they want to sign in with.
 *
 * `sessionId` is set when we have a Stripe session to verify against
 * (the most common, secure path). When it's null we fall back to the
 * cookie-based claim — used for PayPal hosted buttons and offline
 * channels that don't return a session id.
 */
export function ClaimAccountForm({
  sessionId,
  email,
}: {
  sessionId: string | null;
  email: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = sessionId
        ? await claimAccount(formData)
        : await claimGuestAccountByCookie(formData);
      // Server actions only return on the failure path — the success
      // path redirects. Surface whatever error came back.
      if (res && res.ok === false) {
        setError(res.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-3 text-start">
      {sessionId && <input type="hidden" name="session_id" value={sessionId} />}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          الإيميل
        </label>
        <input
          type="email"
          value={email}
          disabled
          dir="ltr"
          className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          اختار كلمة سر للحساب
        </label>
        <div className="relative">
          <Lock className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="password"
            name="password"
            required
            minLength={8}
            dir="ltr"
            autoComplete="new-password"
            placeholder="٨ حروف على الأقل"
            className="w-full h-11 ps-4 pe-11 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs p-3 leading-relaxed">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري التفعيل…
          </>
        ) : (
          <>
            فعّل حسابي وادخل
            <ArrowLeft className="w-4 h-4" />
          </>
        )}
      </Button>

      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
        هندخلك على لوحة الكورسات على طول، وتقدر تستخدم الإيميل وكلمة السر
        دول لو خرجت وعايز تدخل تاني.
      </p>
    </form>
  );
}
