import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
import { provisionFromCheckoutSession } from '@/lib/stripe-sync';
import { hasActiveSubscription } from '@/lib/access';

export const metadata = {
  title: 'تم الاشتراك — فاهم!',
  robots: { index: false, follow: false },
};

// Always render fresh — we hit Stripe and the DB on every visit.
export const dynamic = 'force-dynamic';

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  // Provision the subscription synchronously from the Checkout session, so the
  // user gets access even if the Stripe webhook is delayed or misconfigured.
  // Idempotent — the webhook can run before, after, or never.
  const sessionId = searchParams.session_id;
  if (sessionId) {
    try {
      await provisionFromCheckoutSession(sessionId);
    } catch (err) {
      console.error('[billing/success] provision failed', err);
    }
  }

  const isActive = await hasActiveSubscription(user.id);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-brand-500" />
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-extrabold mb-3">
          تم اشتراكك بنجاح
        </h1>
        <p className="text-gray-600 text-lg mb-2">
          أهلًا بك في <span className="font-bold text-foreground">{APP_NAME}</span> 🎉
        </p>
        <p className="text-sm text-gray-500 mb-8">
          {isActive
            ? 'كل الكورسات مفتوحة لك دلوقتي. ابدأ من اللي يعجبك.'
            : 'بنفعّل اشتراكك الآن. لو الكورسات لسه مش ظاهرة، حدّث الصفحة بعد لحظات.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Button asChild size="lg">
            <Link href={ROUTES.courses}>
              <Sparkles className="w-4 h-4" />
              تصفّح الكورسات
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={ROUTES.dashboard}>روح للوحتي</Link>
          </Button>
        </div>

        <p className="text-xs text-gray-400">
          إيصال الدفع جاي على إيميلك. لو فيه أي مشكلة كلّمنا.
        </p>
      </div>
    </div>
  );
}
