'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sparkles } from 'lucide-react';

/**
 * Consumes a Supabase implicit-flow auth callback dropped onto /login as a
 * URL hash fragment. Triggered when an invitee clicks the link in their
 * email (`type=invite`), but also handles `signup`, `recovery`, and
 * `magiclink` so the flow is robust against Supabase template changes.
 *
 * Why this exists:
 *   - Hash fragments are client-only; the server never sees them.
 *   - Without this handler, the user lands on the login form and is asked
 *     for a password they were never given a chance to set.
 *
 * Flow:
 *   1. Parse access_token + refresh_token out of location.hash.
 *   2. supabase.auth.setSession() — sets the auth cookies via the browser
 *      client so the next navigation sees the session server-side.
 *   3. Clean the hash off the URL (don't leave tokens in history).
 *   4. Bounce to /welcome — that page itself short-circuits to /dashboard
 *      if password_set is already true, so it's the safe single landing.
 */
export function HashAuthHandler() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return;

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const tokenError = params.get('error');
    const errorDescription = params.get('error_description');

    if (tokenError) {
      setStatus('error');
      setErrorMsg(
        errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : 'الرابط مش صالح أو منتهي الصلاحية.'
      );
      return;
    }

    if (!access_token || !refresh_token) return;

    setStatus('processing');
    (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        setStatus('error');
        setErrorMsg(
          'انتهت صلاحية رابط التحقق أو تم استخدامه. اطلب رابط جديد من الإدارة.'
        );
        return;
      }
      // Clear the tokens out of the URL — keep query string (e.g. ?redirect=).
      const cleanUrl = window.location.pathname + window.location.search;
      window.history.replaceState({}, '', cleanUrl);
      // /welcome handles "already set up" → redirects to /dashboard itself,
      // so this single destination works for first-time AND repeat invitees.
      router.replace('/welcome');
    })();
  }, [router]);

  if (status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="max-w-sm w-full mx-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-brand-500/10 text-brand-700 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          {status === 'processing' ? 'جارٍ التحقق من الرابط…' : 'الرابط مش شغّال'}
        </div>
        {status === 'processing' ? (
          <>
            <div className="mx-auto w-10 h-10 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin mb-4" />
            <p className="text-sm text-gray-600">
              ثانية واحدة، بنجهّز حسابك… هتاخدك لصفحة إنشاء كلمة السر دلوقتي.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-destructive font-medium mb-2">{errorMsg}</p>
            <p className="text-xs text-gray-500">
              تواصل مع الإدارة عشان يبعتوا لك رابط جديد.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
