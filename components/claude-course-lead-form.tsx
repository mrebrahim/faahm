'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  submitClaudeCourseLead,
  type ClaudeCourseLeadState,
} from '@/app/leads/claude-course-actions';
import {
  EMAIL_CONSENT_TEXT,
  PRIVACY_NOTE,
  UTM_KEYS,
  WHATSAPP_CONSENT_TEXT,
} from '@/lib/lead-consent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending ? 'ثانية واحدة…' : 'ابعتلي الكورس على إيميلي'}
    </Button>
  );
}

/**
 * Free Claude course sign-up form. Shared by /claude-course and the
 * home/course-page placements (task 62ca1a8a) — pass a distinct
 * `source` per placement so conversion splits cleanly.
 */
export function ClaudeCourseLeadForm({
  source = 'claude-course',
  pagePath = '/claude-course',
  thanksPath = '/claude-course/thanks',
}: {
  source?: string;
  pagePath?: string;
  thanksPath?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [state, action] = useFormState<ClaudeCourseLeadState, FormData>(
    submitClaudeCourseLead,
    { status: 'idle' },
  );
  const fired = useRef(false);

  useEffect(() => {
    if (state.status !== 'ok' || fired.current) return;
    fired.current = true;
    // generate_lead only after the server confirmed the insert.
    window.gtag?.('event', 'generate_lead', { lead_source: source, page_path: pagePath });
    const n = state.name ? `?n=${encodeURIComponent(state.name.split(' ')[0])}` : '';
    router.push(`${thanksPath}${n}`);
  }, [state, source, pagePath, thanksPath, router]);

  return (
    <form action={action} className="flex flex-col gap-4 w-full min-w-0" noValidate>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="page_path" value={pagePath} />
      {UTM_KEYS.map((k) => (
        <input key={k} type="hidden" name={k} value={params.get(k) ?? ''} />
      ))}
      {/* Honeypot — hidden from people, bots fill it. */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cc-name">اسمك</Label>
        <Input id="cc-name" name="name" required autoComplete="name" maxLength={80} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cc-email">إيميلك</Label>
        <Input id="cc-email" name="email" type="email" dir="ltr" required autoComplete="email" inputMode="email" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cc-wa">رقم الواتساب (اختياري)</Label>
        <Input id="cc-wa" name="whatsapp" type="tel" dir="ltr" autoComplete="tel" inputMode="tel" placeholder="+20…" />
      </div>

      <label className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
        <input type="checkbox" name="email_consent" required className="mt-1 h-4 w-4 flex-shrink-0" />
        <span className="min-w-0">{EMAIL_CONSENT_TEXT}</span>
      </label>
      <label className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
        <input type="checkbox" name="whatsapp_consent" className="mt-1 h-4 w-4 flex-shrink-0" />
        <span className="min-w-0">{WHATSAPP_CONSENT_TEXT}</span>
      </label>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <SubmitButton />

      <p className="text-xs text-gray-500">
        {PRIVACY_NOTE}{' '}
        <Link href="/privacy" className="underline">
          سياسة الخصوصية
        </Link>
      </p>
    </form>
  );
}
