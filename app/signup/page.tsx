import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { sendOtp, verifyOtp } from '../login/actions';
import { ArrowLeft, ArrowRight, Mail, KeyRound, CheckCircle2 } from 'lucide-react';

export default function SignupPage({
  searchParams,
}: {
  searchParams: {
    error?: string;
    email?: string;
    name?: string;
    marketing?: string;
    sent?: string;
  };
}) {
  const email = searchParams.email || '';
  const name = searchParams.name || '';
  const marketing = searchParams.marketing === '1';
  const codeStep = !!email && searchParams.sent === '1';

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
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-brand-500/10 flex items-center justify-center">
              {codeStep ? (
                <KeyRound className="w-6 h-6 text-brand-500" />
              ) : (
                <Mail className="w-6 h-6 text-brand-500" />
              )}
            </div>
            <h1 className="font-display text-2xl font-bold mb-1">
              {codeStep ? 'أدخل الكود' : 'إنشاء حساب'}
            </h1>
            <p className="text-sm text-gray-500">
              {codeStep ? (
                <>
                  لإكمال التسجيل، أدخل الرمز المرسل إلى بريدك الإلكتروني (
                  <span dir="ltr" className="font-bold text-foreground">
                    {email}
                  </span>
                  )
                </>
              ) : (
                'هنبعتلك كود من 6 أرقام لتأكيد بريدك. مفيش كلمة سر — الدخول بكود من البريد.'
              )}
            </p>
          </div>

          {searchParams.error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {searchParams.error}
            </div>
          )}

          {!codeStep ? (
            <form action={sendOtp} className="space-y-4">
              <input type="hidden" name="from" value="signup" />
              <input type="hidden" name="redirect" value="/dashboard" />

              <div className="space-y-2">
                <Label htmlFor="full_name">الاسم بالكامل</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  defaultValue={name}
                  placeholder="اسمك"
                  required
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={email}
                  placeholder="you@email.com"
                  required
                  autoComplete="email"
                  dir="ltr"
                  className="text-left"
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  name="marketing_opt_in"
                  value="1"
                  defaultChecked={marketing}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span>
                  أوافق على تلقّي رسائل البريد الإلكتروني الترويجية والتعليمية من مدرسة فاهم
                </span>
              </label>

              <p className="text-xs text-gray-500 leading-relaxed">
                من خلال التسجيل، أنت توافق على شروط الخصوصية الخاصة بـ{' '}
                <Link href="/terms" className="underline hover:text-gray-700">
                  مدرسة فاهم
                </Link>{' '}
                و{' '}
                <Link href="/privacy" className="underline hover:text-gray-700">
                  سياسة الخصوصية
                </Link>
                .
              </p>

              <Button type="submit" size="lg" className="w-full">
                ابعتلي الكود
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <>
              <form action={verifyOtp} className="space-y-4">
                <input type="hidden" name="email" value={email} />
                <input type="hidden" name="redirect" value="/dashboard" />
                <input type="hidden" name="from" value="signup" />

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
                  href={`${ROUTES.signup}?name=${encodeURIComponent(name)}${
                    marketing ? '&marketing=1' : ''
                  }`}
                  className="text-brand-600 hover:underline"
                >
                  <ArrowRight className="w-3.5 h-3.5 inline" />
                  بيانات تانية
                </Link>
                <form action={sendOtp}>
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="full_name" value={name} />
                  {marketing && <input type="hidden" name="marketing_opt_in" value="1" />}
                  <input type="hidden" name="from" value="signup" />
                  <input type="hidden" name="redirect" value="/dashboard" />
                  <button type="submit" className="text-brand-600 hover:underline">
                    إعادة إرسال الرمز
                  </button>
                </form>
              </div>
            </>
          )}

          {!codeStep && (
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-start gap-2 text-gray-500">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" />
                <span>تجربة مجانية لمدة 7 أيام</span>
              </div>
              <div className="flex items-start gap-2 text-gray-500">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" />
                <span>إلغاء الاشتراك في أي وقت</span>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500 space-y-2">
            <div>
              عندك حساب بالفعل؟{' '}
              <Link href={ROUTES.login} className="text-brand-600 hover:text-brand-600 font-medium">
                سجّل دخول
              </Link>
            </div>
            {!codeStep && (
              <div className="text-xs">
                <Link href="/signup/password" className="text-brand-600 hover:underline">
                  إنشاء حساب بكلمة المرور بدلاً من ذلك
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
