import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME, PLANS, ROUTES, type PlanId } from '@/lib/constants';
import { ArrowRight, CheckCircle2, Wallet } from 'lucide-react';
import { PayPalButton } from './paypal-button';

export const metadata = {
  title: `الدفع بـ PayPal — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

const isPlan = (v: unknown): v is PlanId => v === 'monthly' || v === 'yearly';

export default async function PayPalCheckoutPage({
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
      `${ROUTES.login}?redirect=${encodeURIComponent(`/checkout/paypal?plan=${planParam}`)}`
    );
  }

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
              <h1 className="font-display text-xl font-bold">PayPal</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                اشتراك متجدّد تلقائياً
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#003087]/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#003087]" />
            </div>
          </div>

          {/* Order summary */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-xs text-gray-500 mb-1">طلبك</div>
            <div className="flex items-baseline justify-between">
              <div className="font-bold">{plan.name}</div>
              <div className="font-display text-3xl font-extrabold" dir="ltr">
                ${plan.price}
                <span className="text-base text-gray-400 ms-1">
                  / {plan.interval === 'month' ? 'شهر' : 'سنة'}
                </span>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-gray-600">
              {plan.features.slice(0, 3).map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* PayPal button */}
          <div className="p-5 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              هتدفع عبر PayPal مباشرة. الاشتراك بيتجدّد تلقائياً وتقدر تلغيه
              في أي وقت من حسابك في PayPal.
            </p>
            <PayPalButton plan={planParam} />
          </div>

          {/* Footnote */}
          <div className="p-5 bg-gray-50">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              بعد ما تخلّص الدفع في PayPal، ابعتلنا سكرين شوت للتأكيد على
              واتساب وهنفعّل اشتراكك خلال دقايق.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
