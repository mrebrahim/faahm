import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { login } from './actions';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; redirect?: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Background orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-[120px]"
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href={ROUTES.home} className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white text-xl shadow-lg shadow-brand-500/30">
            ف
          </div>
          <span className="font-display font-extrabold text-2xl">{APP_NAME}</span>
        </Link>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 backdrop-blur-sm">
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold mb-2">أهلًا بعودتك</h1>
            <p className="text-sm text-gray-500">سجّل دخولك للوصول لكل الكورسات</p>
          </div>

          {searchParams.error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {searchParams.error}
            </div>
          )}

          <form action={login} className="space-y-4">
            <input type="hidden" name="redirect" value={searchParams.redirect || '/dashboard'} />

            {/* Honeypot fields. Hidden from humans + screen readers, but bots
                blindly fill every <input>. Any value here = automated abuse. */}
            <div aria-hidden="true" className="absolute -left-[10000px] top-auto w-px h-px overflow-hidden">
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
              <label>
                Username
                <input type="text" name="username" tabIndex={-1} autoComplete="off" />
              </label>
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
              <div className="flex justify-between items-center">
                <Label htmlFor="password">كلمة السر</Label>
                <Link
                  href="/reset-password"
                  className="text-xs text-brand-600 hover:text-brand-600"
                >
                  نسيت كلمة السر؟
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                dir="ltr"
                className="text-left"
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              دخول
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            مش عندك حساب؟{' '}
            <Link href={ROUTES.signup} className="text-brand-600 hover:text-brand-600 font-medium">
              سجّل دلوقتي
            </Link>
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
