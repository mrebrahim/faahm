import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME, PLANS, ROUTES, OFFLINE_PAYMENTS, type PlanId } from '@/lib/constants';
import { ArrowRight, Smartphone, Globe2 } from 'lucide-react';
import { CheckoutTracker } from '@/components/checkout-tracker';
import { WhatsAppConfirmButton } from '../_components/whatsapp-confirm';

export const metadata = {
  title: `الدفع بـ Vodafone Cash — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

const isPlan = (v: unknown): v is PlanId => v === 'monthly' || v === 'yearly';

export default async function VodafoneCashOfflinePage({
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
  if (!user) {
    redirect(
      `${ROUTES.login}?redirect=${encodeURIComponent(`/offline/vodafone?plan=${planParam}`)}`
    );
  }

  const number = OFFLINE_PAYMENTS.vodafoneCash.phone;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <CheckoutTracker
        eventId={`checkout-vodafone-${user.id}-${planParam}`}
        value={plan.price}
        currency={plan.currency}
        contentName={plan.name}
        contentIds={[planParam]}
        step="vodafone"
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
              <h1 className="font-display text-xl font-bold">Vodafone Cash أو Barq</h1>
              <p className="text-xs text-gray-500 mt-0.5">محفظة إلكترونية / تحويل دولي</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-red-600" />
            </div>
          </div>

          {/* The receiving number — common to both methods */}
          <div className="p-5 border-b border-gray-100">
            <div className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-2">
              الرقم المستقبِل
            </div>
            <div className="rounded-xl bg-gray-900 text-cyan-300 font-mono text-2xl py-4 px-3 text-center tracking-widest" dir="ltr">
              {number}
            </div>
            <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
              اتفقنا على نفس الرقم سواء حوّلت من فودافون كاش جوّا مصر، أو من
              تطبيق Barq من خارج مصر.
            </p>
          </div>

          {/* Method A: Vodafone Cash (Egypt) */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 text-red-600" />
              </span>
              <h2 className="font-bold text-sm">
                لو في مصر — استخدم Vodafone Cash
              </h2>
            </div>
            <ol className="space-y-3 ps-2">
              <Step n="1">افتح تطبيق فودافون كاش</Step>
              <Step n="2">
                <div>
                  حوّل <span dir="ltr" className="font-bold">${plan.price}</span> (
                  ما يعادلها بالجنيه) على الرقم اللي فوق.
                </div>
              </Step>
              <Step n="3">خد سكرين شوت من إشعار النجاح</Step>
            </ol>
          </div>

          {/* Method B: Barq (international) */}
          <div className="p-5 border-b border-gray-100 bg-emerald-50/40">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Globe2 className="w-4 h-4 text-emerald-700" />
              </span>
              <h2 className="font-bold text-sm">
                لو في السعودية أو خارج مصر — استخدم Barq
              </h2>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              <strong>Barq</strong> محفظة دولية بتسمحلك تحوّل من السعودية
              (وبلاد تانية) مباشرة على رقم Vodafone Cash المصري — بدون تحويل
              بنكي أو ويسترن يونيون.
            </p>
            <ol className="space-y-3 ps-2">
              <Step n="1" tone="emerald">
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
              <Step n="2" tone="emerald">
                اختار "تحويل لمصر → Vodafone Cash" وحط الرقم اللي فوق.
              </Step>
              <Step n="3" tone="emerald">
                ابعت ما يعادل{' '}
                <span dir="ltr" className="font-bold">${plan.price}</span> من
                عملتك المحلية، وخد سكرين شوت من إشعار النجاح.
              </Step>
            </ol>
          </div>

          {/* Amount summary */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">المبلغ المطلوب</div>
              <div className="text-xs text-gray-400 mt-0.5">{plan.name}</div>
            </div>
            <div className="font-display text-3xl font-extrabold text-red-600" dir="ltr">
              ${plan.price}
            </div>
          </div>

          {/* Confirm */}
          <div className="p-5 bg-gray-50">
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              بعد التحويل، ابعت سكرين شوت من إشعار النجاح على واتساب عشان نفعّل
              اشتراكك خلال ساعات قليلة.
            </p>
            <WhatsAppConfirmButton
              email={user.email || ''}
              plan={planParam}
              amountUsd={plan.price}
              channel="Vodafone Cash / Barq"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  tone = 'red',
  children,
}: {
  n: string;
  /** Step accent — red for Vodafone Cash, emerald for Barq. */
  tone?: 'red' | 'emerald';
  children: React.ReactNode;
}) {
  const bg = tone === 'emerald' ? 'bg-emerald-600' : 'bg-red-500';
  return (
    <li className="flex gap-3">
      <span className={`flex-shrink-0 w-6 h-6 rounded-full ${bg} text-white text-xs font-bold flex items-center justify-center`}>
        {n}
      </span>
      <div className="flex-1 min-w-0 pt-0.5 text-sm text-gray-700 leading-relaxed">
        {children}
      </div>
    </li>
  );
}
