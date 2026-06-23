'use client';

import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlanId } from '@/lib/constants';
import { saveGuestEmail } from './actions';

/**
 * Inline email gate shown on /checkout when the visitor isn't signed in.
 * Submits to a server action that stashes the email in a cookie; the
 * page then re-renders with the payment options unlocked. No JS state
 * — the cookie write happens server-side so it works for users with
 * JS disabled too.
 */
export function GuestEmailForm({ plan }: { plan: PlanId }) {
  return (
    <form action={saveGuestEmail} className="space-y-3">
      <input type="hidden" name="plan" value={plan} />
      <div className="relative">
        <Mail className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="email"
          name="email"
          required
          dir="ltr"
          autoComplete="email"
          placeholder="name@example.com"
          className="w-full h-12 ps-4 pe-11 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>
      <Button type="submit" size="lg" className="w-full">
        المتابعة للدفع
      </Button>
      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
        بإكمال الدفع، أنت توافق على{' '}
        <a href="/terms" className="underline">شروط الاستخدام</a> و{' '}
        <a href="/privacy" className="underline">سياسة الخصوصية</a>.
      </p>
    </form>
  );
}
