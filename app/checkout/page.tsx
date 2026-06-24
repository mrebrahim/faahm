import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { CheckoutTracker } from '@/components/checkout-tracker';
import { APP_NAME, PLANS, ROUTES, type PlanId } from '@/lib/constants';
import { pricingFor } from '@/lib/region';
import { SARMoney } from '@/components/sar-money';
import { clearGuestEmail } from './actions';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Ticket,
} from 'lucide-react';
import { GuestEmailForm } from './guest-email-form';

export const metadata = {
  title: `الدفع — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Cookie that carries the guest email between the picker, the payment
 * provider (Stripe/PayPal/offline), and the post-payment claim page so a
 * visitor can pay before signing up. Short-lived; cleared once the user
 * actually has an account.
 */
const GUEST_EMAIL_COOKIE = 'guest_checkout_email';

const isPlan = (v: unknown): v is PlanId => v === 'monthly' || v === 'yearly';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const planParam = searchParams.plan;
  if (!isPlan(planParam)) {
    redirect(ROUTES.pricing);
  }
  const plan = PLANS[planParam];

  // Single-currency funnel: SAR everywhere. The Region machinery still
  // lives in /lib for future flexibility, but every checkout / Stripe
  // call here is locked to 'sa' so display + collection stay in riyals.
  const pricing = pricingFor('sa');
  const regionQs = `&region=sa`;

  // Guest checkout: we no longer redirect anonymous visitors to /signup.
  // Logged-in users still get their email baked into all the payment
  // links; guests enter an email here and we carry it forward via the
  // GUEST_EMAIL_COOKIE so each gateway can stamp it on the order.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const guestEmail = user ? null : cookies().get(GUEST_EMAIL_COOKIE)?.value || null;
  const checkoutEmail = user?.email ?? guestEmail ?? null;
  const emailQs = checkoutEmail ? `&email=${encodeURIComponent(checkoutEmail)}` : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center font-display font-extrabold text-white">
              ف
            </div>
            <span className="font-display font-extrabold text-xl">{APP_NAME}</span>
          </Link>
          <Link
            href={ROUTES.pricing}
            className="text-sm text-gray-500 hover:text-foreground inline-flex items-center gap-1"
          >
            تغيير الخطة
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <CheckoutTracker
          eventId={`checkout-picker-${user?.id ?? checkoutEmail ?? 'guest'}-${planParam}`}
          value={plan.price}
          currency={plan.currency}
          contentName={plan.name}
          contentIds={[planParam]}
          step="picker"
        />
        {/* Order summary. Numbers are pulled from the region-aware
            pricing table so SAR visitors see riyals end-to-end and USD
            visitors see dollars — no FX maths in the markup. */}
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-xs text-brand-700 font-medium mb-1">طلبك</div>
              <h1 className="font-display text-xl font-bold">{plan.name}</h1>
            </div>
            <div className="text-right">
              {planParam === 'yearly' && (
                <div className="text-sm text-gray-400 line-through font-medium">
                  <SARMoney value={pricing.yearlyAnchor} />
                </div>
              )}
              <div className="font-display text-3xl font-extrabold">
                <SARMoney
                  value={
                    planParam === 'yearly'
                      ? pricing.yearlyAmount
                      : pricing.monthlyAmount
                  }
                />
              </div>
              <div className="text-xs text-gray-500">
                / {plan.interval === 'month' ? 'شهر' : 'سنة'}
              </div>
            </div>
          </div>
          <ul className="space-y-1 text-xs text-gray-600">
            {plan.features.slice(0, 3).map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Coupon — visual only; the standing yearly discount that's
            already baked into the price. */}
        {planParam === 'yearly' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-800">
                      كوبون مفعّل
                    </span>
                    <code
                      dir="ltr"
                      className="font-mono text-[11px] font-bold bg-white text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200"
                    >
                      SAVE{pricing.savingsPct}
                    </code>
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    خصم {pricing.savingsPct}% على الاشتراك السنوي — وفّرت{' '}
                    <span className="font-bold">
                      <SARMoney value={pricing.savings} />
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                −<SARMoney value={pricing.savings} />
              </span>
            </div>
          </div>
        )}

        {/* Guest gate: collect an email before any payment buttons are
            shown, so every gateway link can stamp it on the order and the
            success page knows who to provision an account for. Once
            captured, we show the payment options like normal. */}
        {!user && !guestEmail && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-6">
            <h2 className="font-display text-lg font-bold mb-1">
              اكتب إيميلك للمتابعة
            </h2>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              مش محتاج تعمل حساب دلوقتي. ابعت إيميلك، ادفع، وبعد الدفع
              تختار كلمة سرّك وتدخل على الكورسات على طول.
            </p>
            <GuestEmailForm plan={planParam} />
          </div>
        )}

        {(user || guestEmail) && (
          <>
            {!user && guestEmail && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 mb-4 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-600 min-w-0">
                  <div className="text-[11px] text-gray-400">إيميلك للحساب</div>
                  <div className="truncate font-medium" dir="ltr">
                    {guestEmail}
                  </div>
                </div>
                <form action={clearGuestEmail}>
                  <input type="hidden" name="plan" value={planParam} />
                  <button
                    type="submit"
                    className="text-[11px] text-gray-500 hover:text-foreground underline"
                  >
                    تغيير
                  </button>
                </form>
              </div>
            )}

            <h2 className="font-display text-lg font-bold mb-3">اختر طريقة الدفع:</h2>

            <div className="space-y-3">
              {/* Cards / wallets / Apple Pay → Stripe */}
              <PaymentMethod
                href={`/api/checkout?plan=${planParam}${emailQs}${regionQs}`}
                icon={CreditCard}
                title="البطاقات البنكية والمحافظ"
                subtitle="Visa · Mastercard · Apple Pay"
                recommended
              />

              {/* PayPal — subscription with recurring billing */}
              <PaymentMethod
                href={`/checkout/paypal?plan=${planParam}${emailQs}${regionQs}`}
                icon={Wallet}
                title="PayPal"
                subtitle="اشتراك متجدّد تلقائياً — إلغاء في أي وقت"
              />

              {/* InstaPay */}
              <PaymentMethod
                href={`/offline/instapay?plan=${planParam}${emailQs}${regionQs}`}
                icon={Smartphone}
                title="InstaPay"
                subtitle="تحويل فوري من أي بنك مصري"
              />

              {/* Vodafone Cash / Barq */}
              <PaymentMethod
                href={`/offline/vodafone?plan=${planParam}${emailQs}${regionQs}`}
                icon={Smartphone}
                title="Vodafone Cash أو Barq"
                subtitle="فودافون كاش / تحويل دولي من السعودية عبر Barq"
              />
            </div>

            <p className="text-xs text-gray-500 text-center mt-8 leading-relaxed">
              الدفع بالبطاقة بيفعّل اشتراكك تلقائياً. الـ PayPal و InstaPay و
              Vodafone Cash بنأكّدهم يدوياً بعد ما تبعت سكرين شوت على واتساب.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function PaymentMethod({
  href,
  icon: Icon,
  title,
  subtitle,
  external,
  recommended,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  external?: boolean;
  recommended?: boolean;
}) {
  const linkProps = external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' as const }
    : {};
  return (
    <Link
      href={href}
      {...linkProps}
      className={`group flex items-center gap-4 p-4 rounded-2xl border bg-white transition-all hover:shadow-sm ${
        recommended
          ? 'border-brand-500/40 hover:border-brand-500/70'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          recommended ? 'bg-brand-500/10 text-brand-600' : 'bg-gray-50 text-gray-600'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold">{title}</h3>
          {recommended && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-500 text-white">
              الأسرع
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <ArrowLeft className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
    </Link>
  );
}
