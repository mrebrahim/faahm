import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { APP_NAME, PLANS, ROUTES, OFFLINE_PAYMENTS, type PlanId } from '@/lib/constants';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Wallet,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const metadata = {
  title: `الدفع — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

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

  // Require auth so we know who's paying — offline channels need the
  // user's email in the WhatsApp confirmation message.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `${ROUTES.login}?redirect=${encodeURIComponent(`/checkout?plan=${planParam}`)}`
    );
  }

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
        {/* Order summary */}
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-5 mb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-xs text-brand-700 font-medium mb-1">طلبك</div>
              <h1 className="font-display text-xl font-bold">{plan.name}</h1>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-extrabold" dir="ltr">
                ${plan.price}
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

        <h2 className="font-display text-lg font-bold mb-3">اختر طريقة الدفع:</h2>

        <div className="space-y-3">
          {/* Cards / wallets / Apple Pay → Stripe */}
          <PaymentMethod
            href={`/api/checkout?plan=${planParam}`}
            icon={CreditCard}
            title="البطاقات البنكية والمحافظ"
            subtitle="Visa · Mastercard · Apple Pay"
            recommended
          />

          {/* PayPal */}
          <PaymentMethod
            href={OFFLINE_PAYMENTS.paypal[planParam]}
            external
            icon={Wallet}
            title="PayPal"
            subtitle="ادفع بحسابك في باي بال"
          />

          {/* InstaPay */}
          <PaymentMethod
            href={`/offline/instapay?plan=${planParam}`}
            icon={Smartphone}
            title="InstaPay"
            subtitle="تحويل فوري من أي بنك مصري"
          />

          {/* Vodafone Cash */}
          <PaymentMethod
            href={`/offline/vodafone?plan=${planParam}`}
            icon={Smartphone}
            title="Vodafone Cash"
            subtitle="فودافون كاش / محفظة إلكترونية"
          />
        </div>

        <p className="text-xs text-gray-500 text-center mt-8 leading-relaxed">
          الدفع بالبطاقة و PayPal بيفعّل اشتراكك تلقائياً. للـ InstaPay و
          Vodafone Cash، نأكّد الدفع يدوياً بعد ما تبعت سكرين شوت على واتساب.
        </p>
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
