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
import {
  ArrowRight,
  ExternalLink,
  Smartphone,
  Copy,
  CreditCard,
} from 'lucide-react';
import { CheckoutTracker } from '@/components/checkout-tracker';
import { WhatsAppConfirmButton } from '../_components/whatsapp-confirm';

const GUEST_EMAIL_COOKIE = 'guest_checkout_email';

export const metadata = {
  title: `الدفع من مصر — InstaPay أو Vodafone Cash — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

const isPlan = (v: unknown): v is PlanId => v === 'monthly' || v === 'yearly';

/**
 * Egyptian offline-payment combo. Visitors in Egypt can pay with EITHER
 * InstaPay (preferred) or Vodafone Cash on the same page — both quoted
 * in EGP because they're transferring locally and the SAR figure on
 * /pricing doesn't help them in a Vodafone Cash app.
 *
 * EGP pricing is intentionally a separate, charm-priced table (500 /
 * 4000) rather than an FX conversion of the USD funnel. Admins
 * reconcile the WhatsApp screenshot against this EGP figure.
 */
const EGP_AMOUNT: Record<PlanId, number> = {
  monthly: 500,
  yearly: 4000,
};

export default async function EgyptOfflinePage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const planParam = searchParams.plan;
  if (!isPlan(planParam)) redirect(ROUTES.pricing);
  const plan = PLANS[planParam];

  // Guest checkout: accept visitors with just an email in the cookie.
  // Admins confirm manually after the WhatsApp screenshot lands.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const guestEmail = user ? null : cookies().get(GUEST_EMAIL_COOKIE)?.value || null;
  if (!user && !guestEmail) {
    redirect(`/checkout?plan=${planParam}`);
  }
  const ownerEmail = user?.email ?? guestEmail ?? '';

  const egpAmount = EGP_AMOUNT[planParam];
  const instapayLink = OFFLINE_PAYMENTS.instapay.link;
  const vodafoneNumber = OFFLINE_PAYMENTS.vodafoneCash.phone;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(instapayLink)}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <CheckoutTracker
        eventId={`checkout-egp-${user?.id ?? ownerEmail ?? 'guest'}-${planParam}`}
        value={egpAmount}
        currency="EGP"
        contentName={plan.name}
        contentIds={[planParam]}
        step="egp"
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
              <h1 className="font-display text-xl font-bold">
                الدفع من مصر
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                InstaPay أو Vodafone Cash
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-brand-600" />
            </div>
          </div>

          {/* Amount — quoted in EGP because that's what the visitor
              actually transfers from their Egyptian bank/wallet. */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">المبلغ المطلوب</div>
              <div className="text-xs text-gray-400 mt-0.5">{plan.name}</div>
            </div>
            <div className="font-display text-3xl font-extrabold text-brand-600" dir="ltr">
              {egpAmount}
              <span className="text-sm text-gray-400 ms-1">ج.م</span>
            </div>
          </div>

          {/* Method A: InstaPay (the preferred Egyptian rail) */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 text-brand-600" />
              </span>
              <h2 className="font-bold text-sm">
                ١. الطريقة المفضّلة — InstaPay
              </h2>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              تحويل فوري من أي بنك مصري. افتح الرابط على نفس الجهاز اللي
              فيه تطبيق InstaPay، أو امسح الـ QR من موبايل تاني.
            </p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 mb-3">
              <code dir="ltr" className="text-xs text-gray-700 break-all font-mono">
                {instapayLink}
              </code>
            </div>
            <a
              href={instapayLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors mb-3"
            >
              <ExternalLink className="w-4 h-4" />
              افتح رابط الدفع
            </a>
            <div className="flex flex-col items-center bg-white rounded-xl border border-gray-200 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="QR للدفع عبر InstaPay"
                width={220}
                height={220}
                className="rounded"
              />
              <div className="mt-3 text-center">
                <div className="font-mono text-sm font-bold" dir="ltr">
                  {OFFLINE_PAYMENTS.instapay.handle}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Powered by InstaPay
                </div>
              </div>
            </div>
          </div>

          {/* Method B: Vodafone Cash fallback */}
          <div className="p-5 border-b border-gray-100 bg-red-50/40">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 text-red-600" />
              </span>
              <h2 className="font-bold text-sm">
                ٢. أو — Vodafone Cash
              </h2>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              لو ما عندكش InstaPay، حوّل من تطبيق فودافون كاش على الرقم ده:
            </p>
            <div
              className="rounded-xl bg-gray-900 text-cyan-300 font-mono text-2xl py-4 px-3 text-center tracking-widest"
              dir="ltr"
            >
              {vodafoneNumber}
            </div>
            <ol className="space-y-2.5 mt-4 ps-2">
              <Step n="1">افتح تطبيق فودافون كاش</Step>
              <Step n="2">
                <div>
                  حوّل{' '}
                  <span dir="ltr" className="font-bold">
                    {egpAmount} ج.م
                  </span>{' '}
                  على الرقم اللي فوق.
                </div>
              </Step>
              <Step n="3">خد سكرين شوت من إشعار النجاح</Step>
            </ol>
          </div>

          {/* Confirm */}
          <div className="p-5 bg-gray-50">
            <p className="text-xs text-gray-600 leading-relaxed mb-3 flex items-start gap-1.5">
              <Copy className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
              بعد الدفع (بأي من الطريقتين)، خد سكرين شوت من إشعار النجاح
              وابعتها على واتساب عشان نفعّل اشتراكك خلال ساعات قليلة.
            </p>
            <WhatsAppConfirmButton
              email={ownerEmail}
              plan={planParam}
              amount={egpAmount}
              currencyLabel="ج.م"
              channel="InstaPay / Vodafone Cash"
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
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <div className="flex-1 min-w-0 pt-0.5 text-sm text-gray-700 leading-relaxed">
        {children}
      </div>
    </li>
  );
}
