import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { CheckoutTracker } from '@/components/checkout-tracker';
import { APP_NAME, PLANS, ROUTES, type PlanId } from '@/lib/constants';
import { pricingFor } from '@/lib/region';
import { SARMoney } from '@/components/sar-money';
import { SocialProofToast } from '@/components/social-proof-toast';
import { clearGuestEmail } from './actions';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Ticket,
  Globe2,
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

  // Single-currency funnel — every visitor sees USD via pricingFor('us').
  const pricing = pricingFor('us');

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
      {/* Live social proof — PRD §14. The toast auto-pauses the moment
          the visitor focuses any field (incl. the email gate and the
          Stripe iframe), so it never interrupts the payment moment. */}
      <SocialProofToast />

      {/* PRD §3.2 — 'تغيير الخطة' was the #1 click on desktop, signalling
          hesitation. We don't hide it (the visitor genuinely may want
          back-out), but we shrink it to a small secondary link so the
          primary visual weight goes to brand identity + the payment
          method buttons below, not to the back button. */}
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
            className="text-[11px] text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            تغيير الخطة
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <CheckoutTracker
          eventId={`checkout-picker-${user?.id ?? checkoutEmail ?? 'guest'}-${planParam}`}
          // Track the actual USD amount the visitor will pay via the
          // pricingFor('us') helper — Meta + TikTok bid optimisation
          // use the value bucket to allocate spend, so this must match
          // the sticker price on /pricing exactly.
          value={Number(
            planParam === 'yearly'
              ? pricing.yearlyAmount
              : pricing.monthlyAmount
          )}
          currency="USD"
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

        {/* Coupon — visual only; always shown for yearly since every
            tier ($80 mid or $40 deep) sits below the $120 anchor. */}
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

            <div className="flex items-end justify-between gap-3 mb-2">
              <h2 className="font-display text-lg font-bold">اختر طريقة الدفع:</h2>
              {/* Guarantee chip — sits next to the payment heading so the
                  reassurance is locked to the visitor's gaze right when
                  they're picking a rail. PRD §3.3. */}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                🛡️ ضمان استرداد 7 أيام
              </span>
            </div>
            {/* Payment-rail badges — visible RIGHT BEFORE the buttons.
                Baymard 2026: visible rail logos at the rail picker
                drop hesitation by signalling 'your card works here'
                before the visitor commits. We list the four SA visitor
                actually sees on Stripe Checkout (Visa, Mastercard,
                mada, Apple Pay). */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <PayBadge>VISA</PayBadge>
              <PayBadge>Mastercard</PayBadge>
              <PayBadge tone="brand">mada</PayBadge>
              <PayBadge>Apple Pay</PayBadge>
            </div>

            <div className="space-y-3">
              {/* 1. Cards / wallets / Apple Pay → Stripe (SAR) */}
              <PaymentMethod
                href={`/api/checkout?plan=${planParam}${emailQs}`}
                icon={CreditCard}
                title="البطاقات البنكية و Apple Pay"
                subtitle="Visa · Mastercard · Apple Pay — إلغاء في أي وقت"
                recommended
              />

              {/* 2. PayPal — subscription with recurring billing */}
              <PaymentMethod
                href={`/checkout/paypal?plan=${planParam}${emailQs}`}
                icon={Wallet}
                title="PayPal"
                subtitle="اشتراك متجدّد تلقائياً — إلغاء في أي وقت"
              />

              {/* 3. Barq — international transfer from Saudi (SAR) */}
              <PaymentMethod
                href={`/offline/barq?plan=${planParam}${emailQs}`}
                icon={Globe2}
                title="Barq (من السعودية)"
                subtitle="تحويل من حسابك السعودي"
              />

              {/* 4. Egyptian combo — InstaPay + Vodafone Cash (EGP). */}
              <PaymentMethod
                href={`/offline/egp?plan=${planParam}${emailQs}`}
                icon={Smartphone}
                title="من مصر — InstaPay أو Vodafone Cash"
                subtitle="تحويل فوري بالجنيه المصري"
              />
            </div>

            {/* Trust strip — replaces the WhatsApp button that used to
                live floating in this corner. The PRD's #1 distraction
                lift comes from removing the button; the trust pills
                here both backfill the visual weight and address the
                ~25% of abandonments that quote security as the reason. */}
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <TrustPill icon="🔒" text="دفع آمن ومشفّر 100%" />
              <Link
                href="/refund-policy"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-emerald-800 font-medium hover:border-emerald-300 transition-colors"
              >
                🛡️ ضمان استرداد 7 أيام
              </Link>
              <TrustPill icon="⭐" text="+1000 طالب انضموا لفاهم" />
            </div>

            {/* Payment-rail logos. Picking the rails the visitor will see
                on the next page so there's no surprise after they click. */}
            <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-gray-400 flex-wrap">
              <span>Apple Pay</span>
              <span>·</span>
              <span>Visa</span>
              <span>·</span>
              <span>Mastercard</span>
              <span>·</span>
              <span>PayPal</span>
              <span>·</span>
              <span>Barq</span>
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-5 leading-relaxed">
              الدفع بالبطاقة و PayPal بيفعّل اشتراكك تلقائياً. باقي القنوات
              بنأكّدها يدوياً بعد ما تبعت سكرين شوت على واتساب. تعرف أكتر في{' '}
              <Link href="/refund-policy" className="underline hover:text-foreground">
                سياسة الاسترجاع
              </Link>
              .
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function PayBadge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'brand';
}) {
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-wide tabular-nums ${
        tone === 'brand'
          ? 'bg-brand-500/10 border-brand-500/30 text-brand-700'
          : 'bg-white border-gray-200 text-gray-600'
      }`}
    >
      {children}
    </span>
  );
}

function TrustPill({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-center text-gray-700 font-medium">
      <span className="me-1.5">{icon}</span>
      {text}
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
