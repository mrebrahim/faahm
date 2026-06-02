import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME, PLANS, ROUTES, OFFLINE_PAYMENTS, type PlanId } from '@/lib/constants';
import { ArrowRight, Smartphone } from 'lucide-react';
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
              <h1 className="font-display text-xl font-bold">Vodafone Cash</h1>
              <p className="text-xs text-gray-500 mt-0.5">محفظة إلكترونية</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-red-600" />
            </div>
          </div>

          {/* Steps */}
          <div className="p-5 border-b border-gray-100">
            <div className="text-sm font-bold mb-4 text-red-600">خطوات الدفع:</div>
            <ol className="space-y-4">
              <Step n="1">افتح تطبيق فودافون كاش</Step>
              <Step n="2">
                <div>
                  حوّل <span dir="ltr" className="font-bold">${plan.price}</span> (
                  ما يعادلها بالجنيه المصري) على الرقم:
                </div>
                <div className="mt-3 rounded-xl bg-gray-900 text-cyan-300 font-mono text-2xl py-4 px-3 text-center tracking-widest" dir="ltr">
                  {number}
                </div>
              </Step>
              <Step n="3">خد سكرين شوت وابعته على واتساب</Step>
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
              channel="Vodafone Cash"
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
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <div className="flex-1 min-w-0 pt-0.5 text-sm text-gray-700 leading-relaxed">
        {children}
      </div>
    </li>
  );
}
