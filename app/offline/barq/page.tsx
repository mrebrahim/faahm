import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  APP_NAME,
  PLANS,
  ROUTES,
  OFFLINE_PAYMENTS,
  type PlanId,
} from '@/lib/constants';
import { ArrowRight, Globe2, Copy } from 'lucide-react';
import { CheckoutTracker } from '@/components/checkout-tracker';
import { pricingFor } from '@/lib/region';
import { SARMoney } from '@/components/sar-money';
import { WhatsAppConfirmButton } from '../_components/whatsapp-confirm';

const GUEST_EMAIL_COOKIE = 'guest_checkout_email';

export const metadata = {
  title: `الدفع بـ Barq من السعودية — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

const isPlan = (v: unknown): v is PlanId => v === 'monthly' || v === 'yearly';

/**
 * Barq is for Saudi (and other GCC) visitors who want to pay the SAR
 * sticker price without going through Stripe — Barq deposits straight
 * into the same Vodafone Cash account that Egyptian visitors use, so
 * the operational side stays simple, but the visitor sees riyals on
 * every screen.
 */
export default async function BarqOfflinePage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const planParam = searchParams.plan;
  if (!isPlan(planParam)) redirect(ROUTES.pricing);
  const plan = PLANS[planParam];

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const guestEmail = user ? null : cookies().get(GUEST_EMAIL_COOKIE)?.value || null;
  if (!user && !guestEmail) {
    redirect(`/checkout?plan=${planParam}`);
  }
  const ownerEmail = user?.email ?? guestEmail ?? '';

  // Barq users are paying from Saudi → keep the quote in SAR so it
  // matches what they saw on /pricing and /checkout.
  const sarAmount =
    planParam === 'yearly'
      ? Number(pricingFor('sa').yearlyAmount)
      : Number(pricingFor('sa').monthlyAmount);

  const vodafoneNumber = OFFLINE_PAYMENTS.vodafoneCash.phone;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <CheckoutTracker
        eventId={`checkout-barq-${user?.id ?? ownerEmail ?? 'guest'}-${planParam}`}
        value={sarAmount}
        currency="SAR"
        contentName={plan.name}
        contentIds={[planParam]}
        step="barq"
      />
      <div className="container mx-auto px-4 max-w-md">
        <Link
          href={`/checkout?plan=${planParam}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-foreground mb-4"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لطرق الدفع
        </Link>

        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold">Barq</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                تحويل دولي من السعودية
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-emerald-700" />
            </div>
          </div>

          {/* Amount */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">المبلغ المطلوب</div>
              <div className="text-xs text-gray-400 mt-0.5">{plan.name}</div>
            </div>
            <div className="font-display text-3xl font-extrabold text-emerald-700">
              <SARMoney value={sarAmount} />
            </div>
          </div>

          {/* What is Barq + steps */}
          <div className="p-5 border-b border-gray-100">
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              <strong>Barq</strong> محفظة دولية بتسمحلك تحوّل من السعودية
              مباشرة لمحفظة Vodafone Cash المصرية — بدون تحويل بنكي أو
              ويسترن يونيون.
            </p>
            <ol className="space-y-3 ps-2">
              <Step n="1">
                نزّل تطبيق Barq من{' '}
                <a
                  href="https://barq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 underline hover:no-underline"
                >
                  barq.com
                </a>{' '}
                وسجّل حسابك.
              </Step>
              <Step n="2">
                اختار "تحويل لمصر → Vodafone Cash" وحط الرقم اللي تحت.
              </Step>
              <Step n="3">
                ابعت ما يعادل{' '}
                <span className="font-bold">
                  <SARMoney value={sarAmount} />
                </span>{' '}
                من حسابك، وخد سكرين شوت من إشعار النجاح.
              </Step>
            </ol>
          </div>

          {/* Receiving number */}
          <div className="p-5 border-b border-gray-100">
            <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
              الرقم المستقبِل في مصر
            </div>
            <div
              className="rounded-xl bg-gray-900 text-emerald-300 font-mono text-2xl py-4 px-3 text-center tracking-widest"
              dir="ltr"
            >
              {vodafoneNumber}
            </div>
          </div>

          {/* Confirm */}
          <div className="p-5 bg-gray-50">
            <p className="text-xs text-gray-600 leading-relaxed mb-3 flex items-start gap-1.5">
              <Copy className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
              بعد التحويل، خد سكرين شوت من إشعار النجاح وابعتها على
              واتساب عشان نفعّل اشتراكك خلال ساعات قليلة.
            </p>
            <WhatsAppConfirmButton
              email={ownerEmail}
              plan={planParam}
              amount={sarAmount}
              currencyLabel="ر.س"
              channel="Barq"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <div className="flex-1 min-w-0 pt-0.5 text-sm text-gray-700 leading-relaxed">
        {children}
      </div>
    </li>
  );
}
