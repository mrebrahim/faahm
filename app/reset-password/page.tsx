import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from './actions';
import { SetNewPasswordForm } from './set-new-password';

export const metadata = {
  title: 'إعادة تعيين كلمة السر — فاهم!',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; sent?: string; code?: string; recovered?: string };
}) {
  // Two entry points to the "set a new password" UI:
  //   - ?recovered=1: /auth/callback already exchanged the code, the
  //     recovery session is in cookies, and the form just needs to call
  //     updateUser({password}).
  //   - ?code=xxx: legacy direct redirect; the client form exchanges
  //     the code itself. Kept as a fallback for old emails still in
  //     inboxes from before the callback rewire.
  const hasRecoveryCode = Boolean(searchParams.code) || searchParams.recovered === '1';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-[120px]"
      />

      <div className="relative w-full max-w-md">
        <Link href={ROUTES.home} className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-xl shadow-lg shadow-brand-500/30">
            ف
          </div>
          <span className="font-display font-extrabold text-2xl">{APP_NAME}</span>
        </Link>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 backdrop-blur-sm">
          {searchParams.sent ? (
            <SentConfirmation />
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="font-display text-2xl font-bold mb-2">
                  {hasRecoveryCode ? 'كلمة سر جديدة' : 'نسيت كلمة السر؟'}
                </h1>
                <p className="text-sm text-gray-500">
                  {hasRecoveryCode
                    ? 'اختار كلمة سر جديدة قوية. هتسجّل دخول بيها بعد كده.'
                    : 'هنبعتلك لينك على إيميلك تعيد بيه تعيين كلمة السر.'}
                </p>
              </div>

              {searchParams.error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
                  {searchParams.error}
                </div>
              )}

              {hasRecoveryCode ? (
                <SetNewPasswordForm recoveryCode={searchParams.code ?? null} />
              ) : (
                <RequestResetForm />
              )}
            </>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            افتكرت كلمة السر؟{' '}
            <Link
              href={ROUTES.login}
              className="text-brand-600 hover:text-brand-600 font-medium"
            >
              ارجع للدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestResetForm() {
  return (
    <form action={requestPasswordReset} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          dir="ltr"
          className="text-left"
        />
      </div>
      <Button type="submit" size="lg" className="w-full">
        ابعت لينك إعادة التعيين
        <ArrowLeft className="w-4 h-4" />
      </Button>
    </form>
  );
}

function SentConfirmation() {
  return (
    <div className="text-center py-4">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-500/15 flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7 text-brand-500" />
      </div>
      <h1 className="font-display text-2xl font-bold mb-2">شيك على إيميلك</h1>
      <p className="text-sm text-gray-600 leading-relaxed">
        لو الإيميل ده مسجّل عندنا، هتلاقي لينك إعادة التعيين في صندوق الوارد
        خلال دقايق. اللينك صالح لساعة واحدة.
      </p>
      <p className="text-xs text-gray-400 mt-4">
        مش لاقي الإيميل؟ شوف في الـ Spam كمان.
      </p>
    </div>
  );
}
