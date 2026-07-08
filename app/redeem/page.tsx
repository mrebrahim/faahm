import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/phone-input';
import {
  Ticket,
  Mail,
  KeyRound,
  User as UserIcon,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { applyCoupon, sendRedemptionOtp, verifyRedemptionOtp } from './actions';

export const metadata = {
  title: `تفعيل كوبون — ${APP_NAME}`,
  description: 'ادخل كود الكوبون بتاعك عشان تفتح كورس مجاناً على فاهم.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type SearchParams = {
  stage?: string;
  code?: string;
  email?: string;
  name?: string;
  phone?: string;
  sent?: string;
  error?: string;
  plan?: string;
};

export default async function RedeemPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const stage = searchParams.stage || 'code';

  if (stage === 'success') {
    const plan = searchParams.plan === 'yearly' ? 'yearly' : 'monthly';
    return <SuccessView plan={plan} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-500/10 flex items-center justify-center">
            <Ticket className="w-7 h-7 text-brand-600" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold mb-1">
            تفعيل كوبون
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {stage === 'code' && 'ادخل كود الكوبون بتاعك عشان نفتحلك الكورس مجاناً.'}
            {stage === 'details' && 'قدم بياناتك عشان نبعت كود التأكيد على إيميلك.'}
            {stage === 'otp' && 'اكتب الكود اللي وصل على إيميلك عشان نفعّل الكورس.'}
          </p>
        </div>

        {searchParams.error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{decodeURIComponent(searchParams.error)}</span>
          </div>
        )}

        {stage === 'code' && <CodeForm defaultCode={searchParams.code} />}
        {stage === 'details' && (
          <DetailsForm
            defaultEmail={searchParams.email || user?.email || ''}
            defaultName={searchParams.name || ''}
            defaultPhone={searchParams.phone || ''}
          />
        )}
        {stage === 'otp' && (
          <OtpForm email={searchParams.email || ''} />
        )}
      </main>
    </div>
  );
}

function SuccessView({ plan }: { plan: 'monthly' | 'yearly' }) {
  const durationLabel = plan === 'yearly' ? 'سنة كاملة' : 'شهر كامل';
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-emerald-700 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-center py-10 px-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="w-11 h-11" strokeWidth={2.5} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            كوبون مفعّل
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
            مبروك!
          </h1>
          <p className="text-base opacity-95 leading-relaxed">
            تم تفعيل اشتراكك بنجاح لمدة{' '}
            <span className="font-bold">{durationLabel}</span> — كل الكورسات دلوقتي مفتوحة لك مجاناً.
          </p>
        </div>

        <div className="p-6 text-center">
          <ul className="space-y-2.5 text-start text-sm text-gray-700 mb-6">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>وصول كامل لكل الكورسات على فاهم</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>المساعد الذكي فاهم في كل درس</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>شهادة إتمام لكل كورس تخلّصه</span>
            </li>
          </ul>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 text-base transition-colors"
          >
            ابدأ الآن
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link
            href="/courses"
            className="block mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
          >
            أو تصفّح الكورسات الأول
          </Link>
        </div>
      </div>
    </div>
  );
}

function CodeForm({ defaultCode }: { defaultCode?: string }) {
  return (
    <form
      action={applyCoupon}
      className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="code">كود الكوبون</Label>
        <Input
          id="code"
          name="code"
          defaultValue={defaultCode || ''}
          required
          dir="ltr"
          placeholder="COUPON-CODE"
          className="font-mono uppercase text-center text-lg tracking-widest h-14"
          maxLength={20}
          autoFocus
        />
      </div>
      <Button type="submit" size="lg" className="w-full font-bold">
        تطبيق الكوبون
        <ArrowLeft className="w-4 h-4" />
      </Button>
    </form>
  );
}

function DetailsForm({
  defaultEmail,
  defaultName,
  defaultPhone,
}: {
  defaultEmail: string;
  defaultName: string;
  defaultPhone: string;
}) {
  return (
    <form
      action={sendRedemptionOtp}
      className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4"
    >
      <div className="space-y-1">
        <Label htmlFor="full_name">الاسم بالكامل</Label>
        <div className="relative">
          <UserIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="full_name"
            name="full_name"
            defaultValue={defaultName}
            required
            placeholder="محمد أحمد"
            className="ps-10 h-11"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">الإيميل</Label>
        <div className="relative">
          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultEmail}
            required
            dir="ltr"
            placeholder="you@example.com"
            className="ps-10 h-11"
          />
        </div>
        <p className="text-[11px] text-gray-500 mt-1">هنبعت كود التأكيد عليه.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">رقم الموبايل</Label>
        <PhoneInput
          id="phone"
          countryFieldName="country"
          phoneFieldName="phone"
          defaultPhone={defaultPhone}
          required
        />
        <p className="text-[11px] text-gray-500 mt-1">
          اختار كود دولتك من القائمة على الشمال، وبعدين اكتب رقمك بدون الصفر.
        </p>
      </div>

      <Button type="submit" size="lg" className="w-full font-bold">
        <Mail className="w-4 h-4" />
        ابعت لي كود التأكيد
      </Button>

      <p className="text-[11px] text-gray-400 text-center">
        بالتسجيل أنت موافق على{' '}
        <Link href="/terms" className="underline hover:text-gray-600">شروط الاستخدام</Link>
        {' '}و{' '}
        <Link href="/privacy" className="underline hover:text-gray-600">سياسة الخصوصية</Link>.
      </p>
    </form>
  );
}

function OtpForm({ email }: { email: string }) {
  return (
    <form
      action={verifyRedemptionOtp}
      className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4"
    >
      <input type="hidden" name="email" value={email} />

      <div className="text-xs text-gray-500 leading-relaxed">
        بعتنالك كود التأكيد على{' '}
        <span dir="ltr" className="font-medium text-foreground">
          {email}
        </span>
        . لو ما لقيتوش، اتأكد من السبام.
      </div>

      <div className="space-y-1">
        <Label htmlFor="token">كود التأكيد</Label>
        <div className="relative">
          <KeyRound className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="token"
            name="token"
            required
            inputMode="numeric"
            pattern="[0-9]{4,8}"
            minLength={4}
            maxLength={8}
            autoFocus
            dir="ltr"
            className="ps-10 text-lg tracking-[0.35em] text-center font-bold h-14"
            placeholder="12345678"
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full font-bold">
        فعّل الكورس دلوقتي
        <ArrowLeft className="w-4 h-4" />
      </Button>

      <Link
        href="/redeem?stage=details"
        className="block w-full text-center text-xs text-gray-500 hover:text-gray-700 underline"
      >
        غيّر البيانات
      </Link>
    </form>
  );
}
