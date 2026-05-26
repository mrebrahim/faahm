import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { reconcileCheckoutSession } from '@/lib/billing';
import { CheckCircle2, ArrowLeft, Sparkles, PlayCircle } from 'lucide-react';

export const metadata = {
  title: 'شكراً لاشتراكك — فاهم!',
  robots: { index: false, follow: false },
};

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

  // Reconcile the Stripe session server-side so courses unlock the instant
  // the user lands here, regardless of webhook timing. Idempotent — the
  // webhook keys on stripe_subscription_id, so the eventual webhook either
  // finds the same row and updates in place or is a no-op.
  if (searchParams.session_id) {
    await reconcileCheckoutSession(searchParams.session_id);
  }

  // Confirm an active subscription is now visible. If reconcile failed (e.g.
  // missing session_id, weird redirect), the webhook will still write it
  // shortly — show the thank-you page anyway with a softer subtitle.
  const service = createServiceClient();
  const { data: subscription } = await service
    .from('subscriptions')
    .select('plan, current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .gt('current_period_end', new Date().toISOString())
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  const ready = !!subscription;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
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
            ? 'اشتراكك مفعّل وكل الكورسات مفتوحة لك دلوقتي. يلا نبدأ.'
            : 'استلمنا دفعتك وبنفعّل اشتراكك دلوقتي. لو الكورسات مظهرتش مفتوحة خلال دقيقة، حدّث الصفحة.'}
        </p>

        <div className="flex flex-col gap-3 mb-8">
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
