import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { signup } from './actions';
import { ArrowLeft, CheckCircle2, MailCheck } from 'lucide-react';

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  // Success state
  if (searchParams.success) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">شكراً لتسجيلك!</h1>
          <p className="text-ink-300 mb-6">
            بعتنالك إيميل لتأكيد حسابك. افتح الإيميل واضغط على الرابط لتفعيل الحساب.
          </p>
          <Button asChild>
            <Link href={ROUTES.login}>الرجوع لتسجيل الدخول</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/10 blur-[120px]"
      />

      <div className="relative w-full max-w-md">
        <Link href={ROUTES.home} className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-xl shadow-lg shadow-brand-500/30">
            ف
          </div>
          <span className="font-display font-extrabold text-2xl">{APP_NAME}</span>
        </Link>

        <div className="bg-ink-800/40 border border-ink-700/50 rounded-2xl p-8 backdrop-blur-sm">
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold mb-2">أنشئ حسابك</h1>
            <p className="text-sm text-ink-400">ابدأ رحلة التعلّم في دقيقة واحدة</p>
          </div>

          {searchParams.error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {searchParams.error}
            </div>
          )}

          <form action={signup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="إبراهيم محمد"
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
                placeholder="you@example.com"
                required
                autoComplete="email"
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة السر</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="8 أحرف على الأقل"
                minLength={8}
                required
                autoComplete="new-password"
                dir="ltr"
                className="text-left"
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              إنشاء الحساب
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-start gap-2 text-ink-400">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" />
              <span>تجربة مجانية لمدة 7 أيام</span>
            </div>
            <div className="flex items-start gap-2 text-ink-400">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" />
              <span>إلغاء الاشتراك في أي وقت</span>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-ink-400 border-t border-ink-700/50 pt-6">
            عندك حساب بالفعل؟{' '}
            <Link href={ROUTES.login} className="text-brand-400 hover:text-brand-300 font-medium">
              سجّل دخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
