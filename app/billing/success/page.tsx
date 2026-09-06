import Link from 'next/link';
import { headers, cookies } from 'next/headers';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME, PLANS, OFFLINE_PAYMENTS } from '@/lib/constants';
import { ensureUserForEmail, reconcileCheckoutSession } from '@/lib/billing';
import { trackServerEvent } from '@/lib/tracking';
import { pricingFor } from '@/lib/region';
import { PurchaseTracker } from '@/components/purchase-tracker';
import { OtpClaim } from './otp-claim';
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

  // Direct hit on /billing/success with no session, no auth, no guest
  // cookie. Could be a refresh, a bookmark, or a visitor who paid
  // before we got the cookie. Show them the SAME two CTAs the
  // recognised-payer sees — WhatsApp support + an OTP entry — so
  // they can recover with one email + one code instead of bouncing
  // to /login.
  if (!ownerUserId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">
            دفعت بالفعل؟
          </h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            ادخل بإيميلك اللي دفعت بيه — هنبعتلك كود تأكيد على الإيميل،
            وتفتح كورساتك على طول.
          </p>
          <div className="flex flex-col gap-3 text-start">
            <a
              href={(() => {
                const msg = 'لقد دفعت وهذه اسكرين شوت من اشتراكي';
                return `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(msg)}`;
              })()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold text-sm transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              تواصل مع الدعم الفني
            </a>
            <OtpClaim email="" />
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
    // subscription on this site is priced in USD (monthly $10, yearly
    // $80 mid / $40 deep) via the pricingFor('us') helper.
    const saPricing = pricingFor('us');
    const trackingValue = Number(
      plan === 'yearly' ? saPricing.yearlyAmount : saPricing.monthlyAmount
    );
    const trackingCurrency = 'USD';
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
          {ready
            ? subscription?.plan === 'monthly'
              ? 'اشتراكك مفعّل والكورسات مفتوحة لك دلوقتي. يلا نبدأ.'
              : 'اشتراكك مفعّل وكورسات الاشتراك مفتوحة لك دلوقتي. يلا نبدأ.'
            : 'استلمنا دفعتك وبنفعّل اشتراكك دلوقتي. لو الكورسات مظهرتش مفتوحة خلال دقيقة، حدّث الصفحة.'}
        </p>

        {/* Two CTAs everyone sees — paid signed-in user, paid guest,
            or 'paid but Stripe webhook is still catching up' state.
            The WhatsApp button uses our confirmation number with a
            screenshot-ready message; admins follow up there. */}
        <div className="flex flex-col gap-3 mb-6">
          {/* WhatsApp confirmation — always visible. Pre-fills a
              message that matches the merchant's manual reconciliation
              workflow ('have your subscriber screenshot the receipt'). */}
          <a
            href={(() => {
              const msg = [
                'لقد دفعت وهذه اسكرين شوت من اشتراكي',
                ownerEmail ? `الإيميل: ${ownerEmail}` : '',
              ]
                .filter(Boolean)
                .join('\n');
              return `https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}?text=${encodeURIComponent(msg)}`;
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold text-sm transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            تواصل مع الدعم الفني
          </a>

          {/* Start-the-courses CTA. Signed-in visitors go straight to
              /courses (subscription already attached to their session).
              Guests get an inline 6-digit email OTP — no password to
              pick. They enter the code, Supabase sets the cookie,
              the same /courses redirect runs. */}
          {user ? (
            <Button asChild size="lg" className="w-full">
              <Link href={ROUTES.courses}>
                <PlayCircle className="w-5 h-5" />
                ابدأ الكورسات الآن
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
          ) : (
            <OtpClaim email={ownerEmail ?? ''} />
          )}

          {user && (
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link href={ROUTES.dashboard}>
                <Sparkles className="w-4 h-4" />
                روح للوحتي
              </Link>
            </Button>
          )}
        </div>

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
