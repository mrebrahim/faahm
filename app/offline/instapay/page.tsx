import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME, PLANS, ROUTES, OFFLINE_PAYMENTS, type PlanId } from '@/lib/constants';
import { ArrowRight, ExternalLink, Smartphone, Copy } from 'lucide-react';
import { WhatsAppConfirmButton } from '../_components/whatsapp-confirm';

export const metadata = {
  title: `الدفع بـ InstaPay — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

const isPlan = (v: unknown): v is PlanId => v === 'monthly' || v === 'yearly';

export default async function InstapayOfflinePage({
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
      `${ROUTES.login}?redirect=${encodeURIComponent(`/offline/instapay?plan=${planParam}`)}`
    );
  }

  const link = OFFLINE_PAYMENTS.instapay.link;
  // External QR generator: encodes the InstaPay deep link so users can
  // scan from another phone. No client JS / no shipped image needed.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(link)}`;

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
              <h1 className="font-display text-xl font-bold flex items-center gap-2">
                InstaPay
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">تحويل بنكي فوري</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-brand-600" />
            </div>
          </div>

          {/* Amount */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">المبلغ المطلوب</div>
              <div className="text-xs text-gray-400 mt-0.5">{plan.name}</div>
            </div>
            <div className="font-display text-3xl font-extrabold text-brand-600" dir="ltr">
              ${plan.price}
            </div>
          </div>

          {/* Pay link */}
          <div className="p-5 border-b border-gray-100 space-y-3">
            <div>
              <div className="text-sm font-bold mb-2">ادفع باستخدام هذا الرابط</div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                استخدم هذا الخيار إذا كان InstaPay مثبتاً على هذا الجهاز.
              </p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 mb-3">
                <code dir="ltr" className="text-xs text-gray-700 break-all font-mono">
                  {link}
                </code>
              </div>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                افتح رابط الدفع
              </a>
            </div>
          </div>

          {/* QR code */}
          <div className="p-5 border-b border-gray-100">
            <div className="text-sm font-bold mb-2">أو امسح الـ QR</div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              افتح تطبيق InstaPay على هاتف آخر وامسح الكود التالي.
            </p>
            <div className="flex flex-col items-center bg-white rounded-xl border border-gray-200 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="QR للدفع عبر InstaPay"
                width={260}
                height={260}
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

          {/* Confirm */}
          <div className="p-5 bg-gray-50">
            <p className="text-xs text-gray-600 leading-relaxed mb-3 flex items-start gap-1.5">
              <Copy className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
              بعد الدفع، خد سكرين شوت من رسالة التأكيد وابعتها على واتساب عشان
              نفعّل اشتراكك خلال ساعات قليلة.
            </p>
            <WhatsAppConfirmButton
              email={user.email || ''}
              plan={planParam}
              amountUsd={plan.price}
              channel="InstaPay"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
