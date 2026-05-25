import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { sendOtp, verifyOtp } from './actions';
import { HashAuthHandler } from './hash-auth-handler';
import { ArrowLeft, ArrowRight, Mail, KeyRound } from 'lucide-react';

export default function LoginPage({
  searchParams,
}: {
  searchParams: {
    error?: string;
    redirect?: string;
    reset?: string;
    email?: string;
    sent?: string;
  };
}) {
  const email = searchParams.email || '';
  const codeStep = !!email && searchParams.sent === '1';
  const redirectTo = searchParams.redirect || '/dashboard';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Handles #access_token=... fragments coming from Supabase invite,
          recovery and magic-link emails — sets the session client-side and
          bounces to /welcome. */}
      <HashAuthHandler />

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
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-brand-500/10 flex items-center justify-center">
              {codeStep ? (
                <KeyRound className="w-6 h-6 text-brand-500" />
              ) : (
                <Mail className="w-6 h-6 text-brand-500" />
              )}
            </div>
            <h1 className="font-display text-2xl font-bold mb-1">
              {codeStep ? 'أدخل الكود' : 'تسجيل دخول'}
            </h1>
            <p className="text-sm text-gray-500">
              {codeStep ? (
                <>
                  لتسجيل الدخول، أدخل الرمز المرسل إلى بريدك الإلكتروني (
                  <span dir="ltr" className="font-bold text-foreground">
                    {email}
                  </span>
                  )
                </>
              ) : (
                'هنبعتلك كود من 6 أرقام على بريدك للدخول بدون كلمة سر.'
              )}
            </p>
          </div>

          {searchParams.reset && !codeStep && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm text-center">
              تم حفظ كلمة السر الجديدة. سجّل دخولك دلوقتي.
            </div>
          )}

          {searchParams.error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {searchParams.error}
            </div>
          )}

          {!codeStep ? (
            <form action={sendOtp} className="space-y-4">
              <input type="hidden" name="redirect" value={redirectTo} />
              <input type="hidden" name="from" value="login" />

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={email}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  dir="ltr"
                  className="text-left"
                />
              </div>

              <Button type="submit" size="lg" className="w-full">
                ابعتلي الكود
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <>
              <form action={verifyOtp} className="space-y-4">
                <input type="hidden" name="email" value={email} />
                <input type="hidden" name="redirect" value={redirectTo} />
                <input type="hidden" name="from" value="login" />

                <div className="space-y-2">
                  <Label htmlFor="token">الكود</Label>
                  <Input
                    id="token"
                    name="token"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    required
                    minLength={4}
                    maxLength={8}
                    placeholder="123456"
                    dir="ltr"
                    className="text-left text-2xl tracking-[0.5em] font-mono text-center"
                    autoFocus
                  />
                </div>
                <Button type="submit" size="lg" className="w-full">
                  تحقق
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </form>

              <div className="mt-5 flex items-center justify-between text-xs">
                <Link
                  href={`${ROUTES.login}?redirect=${encodeURIComponent(redirectTo)}`}
                  className="text-brand-600 hover:underline"
                >
                  <ArrowRight className="w-3.5 h-3.5 inline" />
                  بريد إلكتروني تاني
                </Link>
                <form action={sendOtp}>
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="redirect" value={redirectTo} />
                  <input type="hidden" name="from" value="login" />
                  <button type="submit" className="text-brand-600 hover:underline">
                    إعادة إرسال الرمز
                  </button>
                </form>
              </div>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
            {codeStep ? (
              <>
                هل تواجه مشكلة؟{' '}
                <Link
                  href={`/login/password${
                    searchParams.redirect
                      ? `?redirect=${encodeURIComponent(redirectTo)}`
                      : ''
                  }`}
                  className="text-brand-600 hover:text-brand-600 font-medium"
                >
                  سجّل الدخول باستخدام كلمة المرور بدلاً من ذلك
                </Link>
              </>
            ) : (
              <>
                مش عندك حساب؟{' '}
                <Link href={ROUTES.signup} className="text-brand-600 hover:text-brand-600 font-medium">
                  سجّل دلوقتي
                </Link>
                <div className="mt-2 text-xs">
                  <Link
                    href={`/login/password${
                      searchParams.redirect
                        ? `?redirect=${encodeURIComponent(redirectTo)}`
                        : ''
                    }`}
                    className="text-brand-600 hover:underline"
                  >
                    سجّل الدخول باستخدام كلمة المرور بدلاً من ذلك
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          بتسجيل دخولك، أنت توافق على{' '}
          <Link href="/terms" className="underline hover:text-gray-600">شروط الاستخدام</Link>{' '}
          و{' '}
          <Link href="/privacy" className="underline hover:text-gray-600">سياسة الخصوصية</Link>
        </p>
      </div>
    </div>
  );
}
