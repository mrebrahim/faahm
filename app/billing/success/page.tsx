import Link from 'next/link';
import { headers, cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME, PLANS, OFFLINE_PAYMENTS } from '@/lib/constants';
import { ensureUserForEmail, reconcileCheckoutSession } from '@/lib/billing';
import { trackServerEvent } from '@/lib/tracking';
import { pricingFor } from '@/lib/region';
import { PurchaseTracker } from '@/components/purchase-tracker';
import { ClaimAccountForm } from './claim-account-form';
import {
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  PlayCircle,
  MessageCircle,
} from 'lucide-react';

export const metadata = {
  title: 'شكراً لاشتراكك — فاهم!',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; gateway?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guest checkout: a visitor may land here without an auth cookie
  // because they paid before signing up. reconcileCheckoutSession both
  // writes the subscription row AND, for guests, provisions a Supabase
  // user from the Stripe session's email so the ClaimAccountForm below
  // has a real user to set a password on.
  const reconciled = searchParams.session_id
    ? await reconcileCheckoutSession(searchParams.session_id)
    : null;

  // PayPal hosted buttons / offline channels don't give us a Stripe
  // session_id, so reconcile can't help. Fall back to the email we
  // stashed on /checkout so the guest can still claim their account
  // — admins confirm the actual subscription manually for these
  // channels (existing WhatsApp flow), but the user account itself can
  // and should be provisioned now.
  const guestEmailCookie = !user
    ? cookies().get('guest_checkout_email')?.value || null
    : null;
  let fallbackOwner: { userId: string; email: string } | null = null;
  if (!user && !reconciled?.userId && guestEmailCookie) {
    const created = await ensureUserForEmail(guestEmailCookie);
    if (created?.userId) {
      fallbackOwner = { userId: created.userId, email: guestEmailCookie };
    }
  }

  // Resolve which Supabase user this success page is for: the signed-in
  // viewer if there's one, otherwise the user we just provisioned from
  // the Stripe session (or the guest cookie).
  const ownerUserId = user?.id ?? reconciled?.userId ?? fallbackOwner?.userId ?? null;
  const ownerEmail =
    user?.email ?? reconciled?.email ?? fallbackOwner?.email ?? null;

  // If we still can't figure out who this payment belongs to, the visitor
  // got here without a session_id (malformed link, refresh, etc.).
  // There's nothing useful we can show — bounce them to /login so they
  // can sign in if they already have an account.
  if (!ownerUserId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">
            مش لاقي تفاصيل الدفع
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            لو دفعت لتوّك، استنّى دقيقة وحدّث الصفحة. أو سجّل دخول لو عندك
            حساب.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href={ROUTES.login}>تسجيل الدخول</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={ROUTES.pricing}>ارجع للأسعار</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Confirm an active subscription is now visible on the owner's row.
  // If the webhook hasn't caught up yet we'll still show the thank-you
  // page but with the softer 'حنا بنفعّل اشتراكك' subtitle.
  const service = createServiceClient();
  const { data: subscription } = await service
    .from('subscriptions')
    .select('plan, current_period_end, gateway, stripe_subscription_id')
    .eq('user_id', ownerUserId)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  const ready = !!subscription;
  // 'Guest claim' covers two cases: the visitor came from Stripe with a
  // session_id we just reconciled, OR they came from PayPal / offline
  // with only the guest_email cookie. In both, they're not signed in
  // but we've already provisioned their account — they need to pick a
  // password.
  const isGuestClaim = !user && (!!searchParams.session_id || !!fallbackOwner);

  // Purchase tracking. Tie everything to the Stripe session_id so client
  // refreshes and server-side CAPI/Events share one event_id and the ad
  // networks deduplicate them. Skip if we don't have a session or we
  // couldn't confirm the subscription.
  let purchaseProps: {
    eventId: string;
    value: number;
    currency: string;
    contentName: string;
    contentIds: string[];
  } | null = null;

  // Pick a transaction id with priority:
  //   1. Stripe session_id from the success_url Stripe sets on the
  //      Payment Link (the normal path for card purchases).
  //   2. subscription.stripe_subscription_id (works for PayPal AND
  //      for Stripe visitors who hit /billing/success directly,
  //      refreshed, or got bounced through a redirect that dropped
  //      the session_id query string — the OLD code skipped tracking
  //      entirely in this case, so Stripe purchases viewed via a
  //      bookmark or quick-back never reported to Meta).
  //   3. user_id as last-resort so a confirmed-active visitor still
  //      fires Purchase even if the subscription row is missing the
  //      gateway id (very rare; legacy data).
  // eventId is stable per-subscription so multiple visits to
  // /billing/success don't trigger duplicate Purchase events at the
  // ad networks — the dedup happens on event_id.
  const txnId =
    searchParams.session_id ||
    subscription?.stripe_subscription_id ||
    (ready && ownerUserId ? `user-${ownerUserId}` : null);
  if (ready && subscription && txnId) {
    const plan = subscription.plan as 'monthly' | 'yearly';
    const planInfo = PLANS[plan];
    // Tracking value must match what the visitor actually paid — every
    // subscription on this site is in SAR (149 / 39). The legacy
    // PLANS.price = 40/9.99 USD is kept only for back-compat on
    // non-tracking surfaces; never feed it to ad networks again.
    const saPricing = pricingFor('sa');
    const trackingValue = Number(
      plan === 'yearly' ? saPricing.yearlyAmount : saPricing.monthlyAmount
    );
    const trackingCurrency = 'SAR';
    const eventId =
      subscription.gateway === 'paypal'
        ? `purchase-paypal-${txnId}`
        : `purchase-${txnId}`;
    // Server log so the merchant can verify Purchase fires from
    // Coolify logs without round-tripping through Meta's 20-min
    // Events Manager delay.
    console.log(
      `[tracking] Purchase fire: plan=${plan} value=${trackingValue} ${trackingCurrency} eventId=${eventId} gateway=${subscription.gateway} user=${ownerUserId}`
    );

    purchaseProps = {
      eventId,
      value: trackingValue,
      currency: trackingCurrency,
      contentName: planInfo.name,
      contentIds: [plan],
    };

    const h = headers();
    const c = cookies();
    const ipChain = h.get('x-forwarded-for') ?? '';
    const ipAddress = ipChain.split(',')[0]?.trim() || h.get('x-real-ip') || null;
    void trackServerEvent({
      eventName: 'Purchase',
      eventId,
      user: {
        email: ownerEmail,
        externalId: ownerUserId,
        ipAddress,
        userAgent: h.get('user-agent'),
        fbp: c.get('_fbp')?.value,
        fbc: c.get('_fbc')?.value,
        ttp: c.get('_ttp')?.value,
      },
      eventSourceUrl: h.get('referer') ?? undefined,
      custom: {
        value: trackingValue,
        currency: trackingCurrency,
        contentName: planInfo.name,
        contentIds: [plan],
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      {purchaseProps && <PurchaseTracker {...purchaseProps} />}
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-brand-500" />
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-extrabold mb-3">
          شكراً لاشتراكك! 🎉
        </h1>
        <p className="text-gray-600 text-lg mb-2">
          أهلاً بيك في <span className="font-bold text-foreground">{APP_NAME}</span>
        </p>
        <p className="text-sm text-gray-500 mb-8">
          {isGuestClaim
            ? 'الدفع وصلنا. خطوة أخيرة: اختار كلمة سر للحساب وادخل على كورساتك.'
            : ready
            ? 'اشتراكك مفعّل وكل الكورسات مفتوحة لك دلوقتي. يلا نبدأ.'
            : 'استلمنا دفعتك وبنفعّل اشتراكك دلوقتي. لو الكورسات مظهرتش مفتوحة خلال دقيقة، حدّث الصفحة.'}
        </p>

        {/* Guest claim: show the password form so the visitor finishes
            creating the account they just paid for. Stripe path passes
            the session_id so the server action can verify the payment
            against Stripe; PayPal / offline paths fall through to the
            cookie-based claim. Once submitted, the server action signs
            them in and redirects to courses. */}
        {isGuestClaim && ownerEmail && (
          <div className="rounded-2xl border border-brand-500/40 bg-white p-5 sm:p-6 mb-6 text-start">
            <ClaimAccountForm
              sessionId={searchParams.session_id ?? null}
              email={ownerEmail}
            />
          </div>
        )}

        {!isGuestClaim && (
          <div className="flex flex-col gap-3 mb-8">
            {!ready && (
              <a
                href={(() => {
                  const msg = [
                    'لقد اشتركت وهذه اسكرين شوت من التحويل',
                    `الإيميل: ${ownerEmail ?? ''}`,
                  ].join('\n');
                  return `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(msg)}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold text-sm transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                اضغط لتأكيد الدفع عبر واتساب
              </a>
            )}
            <Button asChild size="lg" className="w-full">
              <Link href={ROUTES.courses}>
                <PlayCircle className="w-5 h-5" />
                ابدأ التعلم دلوقتي
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link href={ROUTES.dashboard}>
                <Sparkles className="w-4 h-4" />
                روح للوحتي
              </Link>
            </Button>
          </div>
        )}

        {ready && subscription && (
          <p className="text-xs text-gray-400 mb-2">
            اشتراك {subscription.plan === 'yearly' ? 'سنوي' : 'شهري'} ساري حتى{' '}
            {new Date(subscription.current_period_end).toLocaleDateString('ar-EG')}
          </p>
        )}
        <p className="text-xs text-gray-400">
          إيصال الدفع جاي على إيميلك. لو فيه أي مشكلة كلّمنا.
        </p>
      </div>
    </div>
  );
}
