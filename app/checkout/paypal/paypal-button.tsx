'use client';

import Script from 'next/script';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PAYPAL, type PlanId } from '@/lib/constants';
import { activatePayPalSubscription } from './actions';

/**
 * Loads the PayPal SDK with subscription intent + vault, then renders
 * the subscribe button for the selected plan. On approval the
 * subscription id comes back through the SDK callback — we hand it to
 * the server action to verify with PayPal and unlock the user.
 */
export function PayPalButton({ plan }: { plan: PlanId }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const planId = PAYPAL.plans[plan];

  useEffect(() => {
    if (!sdkReady) return;
    if (!containerRef.current) return;
    const w = window as unknown as { paypal?: any };
    if (!w.paypal) return;

    // Re-render is safe: PayPal's SDK supports being called multiple
    // times into the same container — we clear it first to avoid
    // stacked buttons during hot-reload.
    containerRef.current.innerHTML = '';

    w.paypal
      .Buttons({
        style: {
          shape: 'rect',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe',
        },
        createSubscription: function (_data: unknown, actions: any) {
          return actions.subscription.create({ plan_id: planId });
        },
        onApprove: function (data: { subscriptionID: string }) {
          setErr(null);
          startTransition(async () => {
            const res = await activatePayPalSubscription({
              subscriptionId: data.subscriptionID,
              plan,
            });
            if (!res.ok) {
              setErr(res.error);
              return;
            }
            router.push('/billing/success?gateway=paypal');
          });
        },
        onError: function (e: unknown) {
          console.error('[paypal] button error', e);
          setErr('في مشكلة في PayPal، جرّب مرة تانية.');
        },
      })
      .render(containerRef.current);
  }, [sdkReady, plan, planId, router]);

  return (
    <div className="space-y-3">
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${PAYPAL.clientId}&vault=true&intent=subscription`}
        data-sdk-integration-source="button-factory"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />
      <div ref={containerRef} className="min-h-[80px]" />

      {pending && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          جاري تفعيل اشتراكك…
        </div>
      )}
      {!sdkReady && !err && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          جاري تحميل PayPal…
        </div>
      )}
      {err && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {err}
        </div>
      )}
    </div>
  );
}
