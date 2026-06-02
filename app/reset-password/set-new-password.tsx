'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

/**
 * Renders inside /reset-password when Supabase has redirected the user back
 * with a recovery session. Two cases:
 *   - recoveryCode === null: /auth/callback already exchanged the code
 *     server-side; the cookie session is live, we just need updateUser.
 *   - recoveryCode is a string: legacy direct-redirect emails — exchange
 *     the code client-side before letting the user submit.
 */
export function SetNewPasswordForm({ recoveryCode }: { recoveryCode: string | null }) {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(recoveryCode === null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recoveryCode === null) return;
    let cancelled = false;
    (async () => {
      const { error: ex } = await supabase.auth.exchangeCodeForSession(recoveryCode);
      if (cancelled) return;
      if (ex) {
        setExchangeError(
          'اللينك ده مش صالح أو منتهي. اطلب لينك جديد من صفحة "نسيت كلمة السر".'
        );
      } else {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recoveryCode, supabase]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = String(formData.get('password') || '');
    const confirm = String(formData.get('confirm') || '');

    if (password.length < 8) {
      setError('كلمة السر لازم تكون 8 حروف على الأقل');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا السر مش متطابقتين');
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: upd } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (upd) {
      setError(upd.message);
      return;
    }
    router.replace('/login?reset=1');
  }

  if (exchangeError) {
    return (
      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
        {exchangeError}
      </div>
    );
  }

  if (!ready) {
    return <div className="text-center text-sm text-gray-500 py-4">جاري التحقق من اللينك…</div>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="password">كلمة السر الجديدة</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          dir="ltr"
          className="text-left"
          placeholder="على الأقل 8 حروف"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">تأكيد كلمة السر</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          dir="ltr"
          className="text-left"
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? 'جاري الحفظ…' : 'احفظ كلمة السر الجديدة'}
        <ArrowLeft className="w-4 h-4" />
      </Button>
    </form>
  );
}
