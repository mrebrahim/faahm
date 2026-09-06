import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { stripe } from '@/lib/stripe';
import { ROUTES, OFFLINE_PAYMENTS } from '@/lib/constants';
import { fulfilCoursePurchaseSession } from '@/lib/purchases';
import { PurchaseTracker } from '@/components/purchase-tracker';
import { OtpClaim } from '@/app/billing/success/otp-claim';
import { CheckCircle2, ArrowLeft, PlayCircle, MessageCircle, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'تم الشراء — فاهم!',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Landing page after a one-off course / bundle purchase.
 *
 * This page FULFILS as well as thanks. The Stripe webhook is the
 * reliable path, but it can be seconds behind — or misconfigured — and
 * a buyer who lands here should already own what they just paid for.
 * `fulfilCoursePurchaseSession` is idempotent, so both paths running is
 * fine and whichever loses the race does nothing.
 */
export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unlocked: string[] = [];
  let productTitle: string | null = null;
  let productId: string | null = null;
  let amount = 0;
  let currency = 'USD';
  let ownerEmail: string | null = null;
  let failed = false;

  if (searchParams.session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(searchParams.session_id);
      const result = await fulfilCoursePurchaseSession(session);

      if (result) {
        unlocked = result.granted;
        productTitle = result.product.titleAr;
        productId = result.product.id;
        amount = (session.amount_total ?? result.product.priceUsd * 100) / 100;
        currency = (session.currency ?? 'usd').toUpperCase();
        ownerEmail =
          session.customer_email ?? session.customer_details?.email ?? null;
      } else {
        failed = true;
      }
    } catch (err) {
      console.error('[purchase/success] retrieve failed', err);
      failed = true;
    }
  } else {
    failed = true;
  }

  // Titles of what actually opened, read back from the DB rather than
  // trusted from the catalogue — this is the page that tells the buyer
  // what they own, so it should reflect the grant that really happened.
  let courseLinks: Array<{ slug: string; title: string }> = [];
  if (unlocked.length) {
    const { data } = await createServiceClient()
      .from('courses')
      .select('slug, title_ar')
      .in('slug', unlocked);
    courseLinks = (data ?? []).map((c) => ({ slug: c.slug, title: c.title_ar }));
  }

  if (failed) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 text-center">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold mb-3">
            مش لاقيين عملية الشراء
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            لو المبلغ اتخصم من حسابك، ابعتلنا صورة الإيصال على واتساب وهنفعّل
            الكورس فوراً — مش هتدفع تاني.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/${OFFLINE_PAYMENTS.confirmationWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              تواصل مع الدعم
            </a>
            <Button asChild variant="outline" className="w-full">
              <Link href="/courses">تصفّح الكورسات</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      {productId && (
        <PurchaseTracker
          eventId={`purchase_${searchParams.session_id}`}
          value={amount}
          currency={currency}
          contentName={productTitle ?? productId}
          contentIds={unlocked}
        />
      )}

      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold mb-2">
            مبروك! 🎉
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            تم تفعيل <strong>{productTitle}</strong> على حسابك.
            <br />
            الوصول <strong>دايم</strong> — من غير تجديد ولا اشتراك.
          </p>
        </div>

        {courseLinks.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-6">
            <div className="text-xs font-bold text-gray-500 mb-3">
              اللي اتفتح ليك:
            </div>
            <div className="flex flex-col gap-2">
              {courseLinks.map((c) => (
                <Link
                  key={c.slug}
                  href={ROUTES.course(c.slug)}
                  className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800 min-w-0"
                >
                  <PlayCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{c.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {user ? (
            <>
              <Button asChild size="lg" className="w-full font-bold">
                <Link href={courseLinks[0] ? ROUTES.course(courseLinks[0].slug) : ROUTES.dashboard}>
                  <Sparkles className="w-4 h-4" />
                  ابدأ دلوقتي
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href={ROUTES.dashboard}>روح للوحتي</Link>
              </Button>
            </>
          ) : (
            // Guest buyer: the account exists now (provisioned from the
            // Stripe email) but they've never signed in. Same claim flow
            // the subscription funnel uses.
            <OtpClaim email={ownerEmail ?? ''} />
          )}
        </div>

        <p className="mt-5 text-[11px] text-gray-500 text-center leading-relaxed">
          🛡️ ضمان استرداد ٧ أيام · وصلك إيميل بتفاصيل الشراء
        </p>
      </div>
    </main>
  );
}
